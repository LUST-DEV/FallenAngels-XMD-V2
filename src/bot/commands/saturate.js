const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const sharp = require('sharp')
const logger = require('../../logger')
const { downloadQuotedMedia } = require('../../utils/sticker')

const DEFAULT_SATURATION = 2
const MAX_SATURATION = 10

module.exports = {
  name: 'saturate',
  desc: 'Increase or adjust the saturation of an attached or quoted image',
  async run({ sock, jid, msg, args, reply }) {
    const saturation = args.length ? Number(args[0]) : DEFAULT_SATURATION
    if (!Number.isFinite(saturation) || saturation < 0 || saturation > MAX_SATURATION) {
      return reply('> ❌ Use `.saturate [0-10]`. Default saturation is 2; 1 keeps the original colors.')
    }

    try {
      const content = normalizeMessageContent(msg.message || {})
      const quotedMessage = content.extendedTextMessage?.contextInfo?.quotedMessage
      const quotedContent = quotedMessage ? normalizeMessageContent(quotedMessage) : null
      const imageMessage = content.imageMessage || quotedContent?.imageMessage

      if (!imageMessage) {
        return reply('> ❌ Send an image with `.saturate` in its caption, or reply to an image with `.saturate [0-10]`.')
      }

      const imageBuffer = await downloadQuotedMedia(imageMessage, 'image')
      const saturatedImage = await sharp(imageBuffer, { limitInputPixels: 40_000_000 })
        .rotate()
        .modulate({ saturation })
        .png({ compressionLevel: 9 })
        .toBuffer()

      return sock.sendMessage(jid, {
        image: saturatedImage,
        mimetype: 'image/png',
        fileName: 'saturated-image.png',
        caption: `> ✅ Image saturation set to ${saturation}×.`,
      }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'saturate command failed')
      return reply(`> ❌ Could not adjust image saturation: ${error.message}`)
    }
  },
}
