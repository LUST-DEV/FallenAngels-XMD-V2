const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const sharp = require('sharp')
const logger = require('../../logger')
const { downloadQuotedMedia } = require('../../utils/sticker')

module.exports = {
  name: 'imgblur',
  aliases: ['blur'],
  desc: 'Blur an attached or quoted image',
  async run({ sock, jid, msg, reply }) {
    try {
      const content = normalizeMessageContent(msg.message || {})
      const quotedMessage = content.extendedTextMessage?.contextInfo?.quotedMessage
      const quotedContent = quotedMessage ? normalizeMessageContent(quotedMessage) : null
      const imageMessage = content.imageMessage || quotedContent?.imageMessage

      if (!imageMessage) {
        return reply('> ❌ Send an image with `.imgblur` in its caption, or reply to an image with `.imgblur`.')
      }

      const imageBuffer = await downloadQuotedMedia(imageMessage, 'image')
      const blurredImage = await sharp(imageBuffer, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .blur(10)
        .jpeg({ quality: 80 })
        .toBuffer()

      return sock.sendMessage(jid, {
        image: blurredImage,
        mimetype: 'image/jpeg',
        fileName: 'blurred-image.jpg',
        caption: '> ✅ Image blurred successfully.',
      }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'imgblur command failed')
      return reply('> ❌ Could not blur this image. Please try another image.')
    }
  },
}
