const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const sharp = require('sharp')
const logger = require('../logger')
const { downloadQuotedMedia } = require('../utils/sticker')

function escapeXml(text) {
  return text.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
  })[character])
}

async function getImageBuffer(msg) {
  const content = normalizeMessageContent(msg.message || {})
  const quotedMessage = content.extendedTextMessage?.contextInfo?.quotedMessage
  const quotedContent = quotedMessage ? normalizeMessageContent(quotedMessage) : null
  const imageMessage = content.imageMessage || quotedContent?.imageMessage
  if (!imageMessage) return null
  return downloadQuotedMedia(imageMessage, 'image')
}

function createImageEffect(name, description, transform) {
  return {
    name,
    desc: description,
    async run({ sock, jid, msg, args, reply, prefix }) {
      try {
        const image = await getImageBuffer(msg)
        if (!image) {
          return reply(`> ❌ Attach an image with ${prefix}${name} in its caption, or reply to an image with ${prefix}${name}.`)
        }

        const output = await transform(image, args)
        return sock.sendMessage(jid, {
          image: output,
          mimetype: 'image/png',
          fileName: `${name}-image.png`,
          caption: `> ✅ Image ${name} effect applied.`,
        }, { quoted: msg })
      } catch (error) {
        logger.warn({ jid, command: name, err: error.message }, `image ${name} command failed`)
        return reply(`> ❌ Could not apply ${name} to this image: ${error.message}`)
      }
    },
  }
}

function parseFactor(args, defaultValue, min, max, label) {
  const factor = args.length ? Number(args[0]) : defaultValue
  if (!Number.isFinite(factor) || factor < min || factor > max) {
    throw new Error(`Use ${label} between ${min} and ${max}.`)
  }
  return factor
}

function createCaptionOverlay(width, height, caption) {
  const fontSize = Math.max(22, Math.min(64, Math.round(width / 18)))
  const maxCharsPerLine = Math.max(10, Math.floor(width / (fontSize * 0.62)))
  const words = caption.split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length > maxCharsPerLine && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  if (lines.length > 6) throw new Error('Caption must fit within 6 lines.')

  const lineHeight = Math.round(fontSize * 1.25)
  const padding = Math.round(fontSize * 0.55)
  const boxHeight = lines.length * lineHeight + padding * 2
  const text = lines.map((value, index) =>
    `<text x="${width / 2}" y="${padding + fontSize + index * lineHeight}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${escapeXml(value)}</text>`,
  ).join('')

  return Buffer.from(
    `<svg width="${width}" height="${boxHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#000000" fill-opacity="0.68"/>${text}</svg>`,
  )
}

const effects = {
  brightness: createImageEffect('brightness', 'Adjust image brightness', async (image, args) => {
    const brightness = parseFactor(args, 1.25, 0, 3, 'brightness')
    return sharp(image, { limitInputPixels: 40_000_000 }).rotate().modulate({ brightness }).png().toBuffer()
  }),
  contrast: createImageEffect('contrast', 'Adjust image contrast', async (image, args) => {
    const contrast = parseFactor(args, 1.5, 0, 3, 'contrast')
    return sharp(image, { limitInputPixels: 40_000_000 }).rotate().linear(contrast, 128 * (1 - contrast)).png().toBuffer()
  }),
  grayscale: createImageEffect('grayscale', 'Convert an image to grayscale', async (image) =>
    sharp(image, { limitInputPixels: 40_000_000 }).rotate().greyscale().png().toBuffer(),
  ),
  mirror: createImageEffect('mirror', 'Flip an image horizontally', async (image) =>
    sharp(image, { limitInputPixels: 40_000_000 }).rotate().flop().png().toBuffer(),
  ),
  pixelate: createImageEffect('pixelate', 'Pixelate an image', async (image, args) => {
    const blockSize = parseFactor(args, 16, 2, 64, 'pixel size')
    const sharpImage = sharp(image, { limitInputPixels: 40_000_000 }).rotate()
    const { width, height } = await sharpImage.metadata()
    if (!width || !height) throw new Error('Could not read the image dimensions.')
    return sharpImage
      .resize(Math.max(1, Math.round(width / blockSize)), Math.max(1, Math.round(height / blockSize)), { fit: 'fill' })
      .resize(width, height, { fit: 'fill', kernel: 'nearest' })
      .png()
      .toBuffer()
  }),
  sepia: createImageEffect('sepia', 'Apply a sepia tone to an image', async (image) =>
    sharp(image, { limitInputPixels: 40_000_000 })
      .rotate()
      .greyscale()
      .tint({ r: 112, g: 78, b: 45 })
      .png()
      .toBuffer(),
  ),
  invert: createImageEffect('invert', 'Invert image colors', async (image) =>
    sharp(image, { limitInputPixels: 40_000_000 }).rotate().negate().png().toBuffer(),
  ),
  sharpen: createImageEffect('sharpen', 'Sharpen image details', async (image, args) => {
    const sigma = parseFactor(args, 1.2, 0.3, 3, 'sharpness')
    return sharp(image, { limitInputPixels: 40_000_000 }).rotate().sharpen({ sigma }).png().toBuffer()
  }),
  vintage: createImageEffect('vintage', 'Apply a warm vintage look to an image', async (image) =>
    sharp(image, { limitInputPixels: 40_000_000 })
      .rotate()
      .modulate({ saturation: 0.75, brightness: 0.97 })
      .tint({ r: 238, g: 220, b: 190 })
      .png()
      .toBuffer(),
  ),
  caption: createImageEffect('caption', 'Add a caption to an image', async (image, args) => {
    const caption = args.join(' ').trim()
    if (!caption) throw new Error('Add text after the command, for example `.caption Hello world`.')
    if (caption.length > 160) throw new Error('Caption must be 160 characters or fewer.')
    const sharpImage = sharp(image, { limitInputPixels: 40_000_000 }).rotate()
    const { width, height } = await sharpImage.metadata()
    if (!width || !height) throw new Error('Could not read the image dimensions.')
    const overlay = createCaptionOverlay(width, height, caption)
    return sharpImage
      .composite([{ input: overlay, gravity: 'south' }])
      .png()
      .toBuffer()
  }),
}

module.exports = effects
