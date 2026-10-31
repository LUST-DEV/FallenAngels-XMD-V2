const logger = require('../../logger')
const { isGroupJid } = require('../groupUtils')

module.exports = {
  name: 'event',
  desc: 'Create a WhatsApp event in the group',
  async run({ sock, msg, args, prefix }) {
    const jid = msg.key.remoteJid
    if (!isGroupJid(jid)) {
      return sock.sendMessage(jid, {
        text: '> ❌ 𝐓ʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴍᴜsᴛ ʙᴇ ᴜsᴇᴅ ɪɴ ᴀ ɢʀᴏᴜᴘ.',
      }, { quoted: msg })
    }

    const [name, startText, ...descriptionParts] = args.join(' ').split('|').map((part) => part.trim())
    const startDate = startText && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(startText)
      ? new Date(startText)
      : null
    if (!name || !startDate || Number.isNaN(startDate.getTime()) || startDate <= new Date()) {
      return sock.sendMessage(jid, {
        text: `> 𝐔sᴀɢᴇ: ${prefix}event <ᴛɪᴛʟᴇ>|<ɪsᴏ ᴅᴀᴛᴇ ᴡɪᴛʜ ᴛɪᴍᴇᴢᴏɴᴇ>|<ᴏᴘᴛɪᴏɴᴀʟ ᴅᴇsᴄʀɪᴘᴛɪᴏɴ>\nE.x.: ${prefix}event Mᴇᴇᴛɪɴɢ|2026-11-02T18:00-04:00|Wᴇᴇᴋʟʏ ᴄʜᴇᴄᴋ-ɪɴ`,
      }, { quoted: msg })
    }

    const description = descriptionParts.join(' | ').trim()
    try {
      await sock.sendMessage(jid, {
        event: {
          name,
          startDate,
          ...(description ? { description } : {}),
        },
      }, { quoted: msg })
    } catch (error) {
      logger.error({ jid, name, startDate: startDate.toISOString(), err: error }, 'failed to create WhatsApp group event')
      return sock.sendMessage(jid, {
        text: '> ❌ 𝐔ɴᴀʙʟᴇ ᴛᴏ ᴄʀᴇᴀᴛᴇ ᴛʜᴇ WʜᴀᴛsAᴘᴘ ᴇᴠᴇɴᴛ.',
      }, { quoted: msg })
    }
  },
}
