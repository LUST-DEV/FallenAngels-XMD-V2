const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const { GroupSetting } = require('../database')
const logger = require('../logger')
const { participantJid, sameJid } = require('./groupUtils')

const LINK_PATTERN = /(?:https?:\/\/|www\.)[^\s<>()]+|\b(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s<>()]*)?/i
const LINK_TEXT_KEYS = new Set([
  'text',
  'caption',
  'contentText',
  'description',
  'matchedText',
  'url',
  'canonicalUrl',
])

function messageText(message) {
  const content = normalizeMessageContent(message)
  const values = []

  function collectText(value) {
    if (!value || typeof value !== 'object') return
    for (const [key, nested] of Object.entries(value)) {
      if (typeof nested === 'string' && LINK_TEXT_KEYS.has(key)) {
        values.push(nested)
      } else if (nested && typeof nested === 'object') {
        collectText(nested)
      }
    }
  }

  if (typeof content?.conversation === 'string') values.push(content.conversation)
  collectText(content)
  return values.join('\n')
}

async function moderateGroupMessage(sock, msg) {
  const groupJid = msg.key.remoteJid
  if (!groupJid?.endsWith('@g.us') || msg.key.fromMe) return

  const settings = await GroupSetting.findByPk(groupJid, {
    attributes: ['antilinkEnabled'],
  })
  if (!settings?.antilinkEnabled) return

  const text = messageText(msg.message)
  if (!LINK_PATTERN.test(text)) return

  const metadata = await sock.groupMetadata(groupJid)
  const participants = metadata.participants || []
  const senderJid = msg.key.participant || msg.key.participantAlt || msg.participant
  const sender = participants.find((participant) => sameJid(participantJid(participant), senderJid))
  if (sender?.admin === 'admin' || sender?.admin === 'superadmin') return

  const botJids = [sock.user?.id, sock.user?.lid].filter(Boolean)
  const bot = participants.find((participant) =>
    botJids.some((jid) => sameJid(participantJid(participant), jid)),
  )
  const botIsAdmin = bot?.admin === 'admin' || bot?.admin === 'superadmin'
  const warningText = senderJid
    ? `⚠️ @${senderJid.split('@')[0].split(':')[0]}, 𝐋ɪɴᴋs ᴀʀᴇ ɴᴏᴛ ᴀʟʟᴏᴡᴇᴅ ɪɴ ᴛʜɪs ɢʀᴏᴜᴘ.`
    : '⚠️ 𝐋ɪɴᴋs ᴀʀᴇ ɴᴏᴛ ᴀʟʟᴏᴡᴇᴅ ɪɴ ᴛʜɪs ɢʀᴏᴜᴘ.'
  const warningOptions = senderJid
    ? { contextInfo: { mentionedJid: [senderJid] } }
    : {}

  if (botIsAdmin) {
    try {
      await sock.sendMessage(groupJid, { delete: msg.key })
    } catch (error) {
      logger.warn({ groupJid, senderJid, err: error.message }, 'échec de suppression du lien interdit')
      await sock.sendMessage(groupJid, {
        text: `🚫 ${warningText}\n𝐓ʜᴇ ʙᴏᴛ ᴄᴏᴜʟᴅ ɴᴏᴛ ᴅᴇʟᴇᴛᴇ ᴛʜᴇ ᴍᴇssᴀɢᴇ.`,
        ...warningOptions,
      })
      return
    }

    await sock.sendMessage(groupJid, {
      text: `🚫 ${warningText}`,
      ...warningOptions,
    })
    return
  }

  await sock.sendMessage(groupJid, {
    text: `⚠️ ${warningText}\n𝐓ʜᴇ ʙᴏᴛ ᴍᴜsᴛ ʙᴇ ᴀ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ ᴛᴏ ᴅᴇʟᴇᴛᴇ ʟɪɴᴋs.`,
    ...warningOptions,
  })
}

module.exports = { moderateGroupMessage }
