const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const logger = require('../../logger')
const { downloadQuotedMedia, videoToGif } = require('../../utils/sticker')

module.exports = {
  name: 'togif',
  aliases: ['videotogif'],
  desc: 'Convert a video to a GIF',
  async run({ sock, jid, msg, reply }) {
    try {
      const content = normalizeMessageContent(msg.message || {})
      const quotedMessage = content.extendedTextMessage?.contextInfo?.quotedMessage
      const quotedContent = quotedMessage ? normalizeMessageContent(quotedMessage) : null
      const videoMessage = content.videoMessage || quotedContent?.videoMessage

      if (!videoMessage) {
        return reply('> ❌ Attach a video with `.togif` in its caption, or reply to a video with `.togif`.')
      }

      const video = await downloadQuotedMedia(videoMessage, 'video')
      const gif = await videoToGif(video)
      return sock.sendMessage(jid, {
        document: gif,
        mimetype: 'image/gif',
        fileName: 'video.gif',
        caption: '> ✅ Video converted to GIF (first 10 seconds, up to 16 MB).',
      }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'video to GIF conversion failed')
      return reply(`> ❌ Could not convert the video to a GIF: ${error.message}`)
    }
  },
}
