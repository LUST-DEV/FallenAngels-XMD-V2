const { GroupSetting } = require('../../database')
const { isGroupJid, participantJid, participantNumber, sameJid } = require('../groupUtils')

const DEFAULT_SHIPPING_INTERVAL_MS = 2 * 60 * 60 * 1000 + 45 * 60 * 1000
const groupOperations = new Map()
const countdownMessages = [
  '⏳ The new couple of the day will be picked in {time}. Cupid is preparing the draw!',
  '💘 Be patient… the next soulmates will be revealed in {time}.',
  '🔮 Cupid is reading the stars: the next duo arrives in {time}.',
  '✨ The next New Couple Today will be announced in {time}. Stay tuned!',
]

function formatDuration(milliseconds) {
  let seconds = Math.ceil(milliseconds / 1000)
  const hours = Math.floor(seconds / 3600)
  seconds %= 3600
  const minutes = Math.floor(seconds / 60)
  seconds %= 60
  const parts = []

  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
  if (minutes || hours) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`)
  parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`)
  return parts.join(' ')
}

function withGroupLock(groupJid, operation) {
  const previous = groupOperations.get(groupJid) || Promise.resolve()
  const current = previous.catch(() => {}).then(operation)
  groupOperations.set(groupJid, current)
  return current.finally(() => {
    if (groupOperations.get(groupJid) === current) groupOperations.delete(groupJid)
  })
}

function pickPair(participants, botJid) {
  const eligible = participants.filter((participant) => {
    const jid = participantJid(participant)
    return typeof jid === 'string' && jid.includes('@') && !sameJid(jid, botJid)
  })
  if (eligible.length < 2) return null

  const firstIndex = Math.floor(Math.random() * eligible.length)
  const [first] = eligible.splice(firstIndex, 1)
  const second = eligible[Math.floor(Math.random() * eligible.length)]
  return [participantJid(first), participantJid(second)]
}

module.exports = {
  name: 'shipping',
  desc: 'Pick a random couple from the group every 2 hours 45 minutes',
  async run({ sock, msg, jid, prefix, reply }) {
    if (!isGroupJid(jid)) {
      return reply('> ❌ This command can only be used in a WhatsApp group.')
    }

    const intervalMs = DEFAULT_SHIPPING_INTERVAL_MS
    const metadata = await sock.groupMetadata(jid)

    return withGroupLock(jid, async () => {
      const [settings] = await GroupSetting.findOrCreate({
        where: { groupJid: jid },
      })
      const now = Date.now()
      const nextAt = settings.shippingNextAt ? new Date(settings.shippingNextAt).getTime() : 0

      if (settings.shippingNextAt && !Number.isFinite(nextAt)) {
        throw new Error(`Invalid shipping cooldown for group ${jid}.`)
      }

      if (nextAt > now) {
        const message = countdownMessages[Math.floor(Math.random() * countdownMessages.length)]
        return reply(message.replace('{time}', formatDuration(nextAt - now)))
      }

      const pair = pickPair(metadata.participants || [], sock.user?.id)
      if (!pair) {
        return reply('> ❌ At least two other group members are needed to pick a couple.')
      }

      await settings.update({ shippingNextAt: new Date(now + intervalMs) })
      const [first, second] = pair
      return sock.sendMessage(jid, {
        text: `💘 New Couple Today!\n\n✨ Cupid's choice: @${participantNumber(first)} 💞 @${participantNumber(second)}\n\nMay their story begin!`,
        mentions: pair,
      }, { quoted: msg })
    })
  },
}