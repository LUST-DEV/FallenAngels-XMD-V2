const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const sharp = require('sharp')
const logger = require('../../logger')
const { downloadQuotedMedia, imageToSticker, stickerToImage } = require('../../utils/sticker')

function escapeXml(text) {
  return text.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
  })[character])
}

module.exports = {
  name: 'sign',
  desc: 'Create a sticker with a custom name written on it',
  async run({ sock, jid, msg, args, reply }) {
    const name = args.join(' ').trim()
    if (!name || name.length > 40) {
      return reply('> ❌ Reply to an image or sticker with `.sign <name>` (up to 40 characters).')
    }

    try {
      const content = normalizeMessageContent(msg.message || {})
      const quotedMessage = content.extendedTextMessage?.contextInfo?.quotedMessage
      const quotedContent = quotedMessage ? normalizeMessageContent(quotedMessage) : null
      const imageMessage = content.imageMessage || quotedContent?.imageMessage
      const stickerMessage = quotedContent?.stickerMessage
      if (!imageMessage && !stickerMessage) {
        return reply('> ❌ Attach an image, or reply to an image or sticker with `.sign <name>`.')
      }

      const input = imageMessage
        ? await downloadQuotedMedia(imageMessage, 'image')
        : await stickerToImage(await downloadQuotedMedia(stickerMessage, 'sticker'))
      const base = sharp(input, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
      const width = 512
      const height = 512
      const fontSize = Math.max(14, Math.min(46, Math.floor((width * 0.9) / (name.length * 0.65))))
      const label = Buffer.from(
        `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="${Math.round(height * 0.92)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff" stroke="#000000" stroke-width="2" stroke-linejoin="round" paint-order="stroke">${escapeXml(name)}</text></svg>`,
      )
      const signedImage = await base.composite([{ input: label }]).png().toBuffer()
      const sticker = await imageToSticker(signedImage)
      return sock.sendMessage(jid, { sticker }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'sign sticker command failed')
      return reply(`> ❌ Could not create the signed sticker: ${error.message}`)
    }
  },
}
