const logger = require('../../logger')
const { downloadSocialMedia, extractUrl, isValidPostUrl } = require('../socialMediaDownload')

module.exports = {
  name: 'twitter',
  aliases: ['x', 'twitterdl'],
  desc: 'Download public X/Twitter images and videos',
  async run({ sock, jid, msg, args, reply }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const text = args.join(' ') || quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const url = extractUrl(text)
    if (!url || !isValidPostUrl('twitter', url)) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .twitter <ᴘᴜʙʟɪᴄ X/𝐓ᴡɪᴛᴛᴇʀ ᴘᴏsᴛ ʟɪɴᴋ>')
    }

    try {
      await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } })
    } catch (error) {
      logger.debug({ jid, err: error.message }, 'unable to show X/Twitter download reaction')
    }

    try {
      const result = await downloadSocialMedia('twitter', url)
      const caption = `╭─❮ 𓆩 𝐗 / 𝐓ᴡɪᴛᴛᴇʀ 𝐌ᴇᴅɪᴀ ❯\n│ ✦ 𝐓ɪᴛʟᴇ: ${result.title}\n│ ✦ 𝐌ᴇᴅɪᴀ: ${result.files.length}\n╰─────────────────────────`
      for (let index = 0; index < result.files.length; index += 1) {
        const file = result.files[index]
        const content = file.mimetype.startsWith('video/')
          ? { video: file.buffer, mimetype: file.mimetype }
          : { image: file.buffer, mimetype: file.mimetype }
        if (index === 0) content.caption = caption
        await sock.sendMessage(jid, content, { quoted: msg })
      }
    } catch (error) {
      logger.error({ jid, url, err: error }, 'X/Twitter media download failed')
      return reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ X/𝐓ᴡɪᴛᴛᴇʀ ᴍᴇᴅɪᴀ. 𝐔sᴇ ᴀ ᴘᴜʙʟɪᴄ ᴘᴏsᴛ ʟɪɴᴋ ᴀɴᴅ ᴛʀʏ ᴀɢᴀɪɴ.')
    }
  },
}
