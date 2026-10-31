const logger = require('../../logger')
const { Reminder } = require('../../database')
const { scheduleReminder } = require('../reminderScheduler')

const MAX_DELAY_MS = 30 * 24 * 60 * 60 * 1000

function parseDelay(value) {
  const match = value.match(/^(\d+)(s|m|h|d)$/i)
  if (!match) return null
  const amount = Number(match[1])
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2].toLowerCase()]
  const delay = amount * unit
  return Number.isSafeInteger(delay) && delay > 0 && delay <= MAX_DELAY_MS ? delay : null
}

module.exports = {
  name: 'remind',
  aliases: ['timer', 'remindme', 'countdown'],
  desc: 'Schedule a reminder in this chat',
  async run({ sock, jid, args, numero, reply }) {
    const delay = parseDelay(args[0] || '')
    const message = args.slice(1).join(' ').trim()
    if (!delay || !message || message.length > 500) {
      return reply('𝐔sᴀɢᴇ: .remind <𝟣𝟢s|𝟣𝟢m|𝟤h|𝟣d> <ᴍᴇssᴀɢᴇ> (ᴍᴀx: 𝟥𝟢 ᴅᴀʏs)')
    }
    try {
      const reminder = await Reminder.create({
        numero,
        jid,
        message,
        dueAt: new Date(Date.now() + delay),
      })
      scheduleReminder(reminder, sock)
      return reply(`⏰ 𝐑ᴇᴍɪɴᴅᴇʀ sᴇᴛ ғᴏʀ ${reminder.dueAt.toLocaleString()}.`)
    } catch (error) {
      logger.error({ numero, jid, err: error }, 'failed to save reminder')
      return reply('❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ sᴀᴠᴇ ᴛʜᴇ ʀᴇᴍɪɴᴅᴇʀ. 𝐓ʀʏ ᴀɢᴀɪɴ.')
    }
  },
}
