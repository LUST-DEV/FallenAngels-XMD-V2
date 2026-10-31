const config = require('../../config')
const logger = require('../../logger')

const MAX_PROMPT_LENGTH = 1000
const MAX_IMAGE_BYTES = 16 * 1024 * 1024

module.exports = {
  name: 'imagine',
  aliases: ['imagegen', 'generateimage'],
  desc: 'Generate an image from a text prompt with Gemini',
  async run({ sock, jid, msg, args, reply, prefix }) {
    const prompt = args.join(' ').trim()
    if (!prompt) return reply(`> ❌ Usage: ${prefix}imagine <image description>`)
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return reply(`> ❌ Keep the image description under ${MAX_PROMPT_LENGTH} characters.`)
    }
    if (!config.geminiApiKey) {
      return reply('> ⚙️ Image generation is not configured. Add GEMINI_API_KEY to the bot .env file.')
    }

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': config.geminiApiKey,
        },
        body: JSON.stringify({
          model: config.geminiImageModel,
          input: prompt,
        }),
        signal: AbortSignal.timeout(90_000),
      })

      if (!response.ok) {
        logger.warn({ jid, status: response.status }, 'Gemini image generation API rejected the request')
        if (response.status === 401 || response.status === 403) {
          return reply('> ❌ Gemini rejected the API key or the key does not have image-generation access.')
        }
        if (response.status === 429) {
          return reply('> ⚠️ Gemini image-generation quota or rate limit reached. Try again later.')
        }
        const details = (await response.text()).slice(0, 250)
        return reply(`> ❌ Gemini image generation failed (HTTP ${response.status}).${details ? ` ${details}` : ''}`)
      }

      const result = await response.json()
      const image = result.output_image
      if (!image?.data || typeof image.data !== 'string') {
        logger.warn({ jid, responseId: result.id }, 'Gemini returned no generated image')
        return reply('> ❌ Gemini did not return an image. Try a more specific description.')
      }

      const buffer = Buffer.from(image.data, 'base64')
      if (!buffer.length) throw new Error('Gemini returned an empty image.')
      if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Generated image exceeds the 16 MB limit.')

      return sock.sendMessage(jid, {
        image: buffer,
        mimetype: image.mime_type || 'image/png',
        caption: `> ✨ Generated with Gemini\n> 📝 ${prompt.slice(0, 500)}`,
      }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'Gemini image generation failed')
      return reply('> ❌ Could not generate an image right now. Check the Gemini API key and try again.')
    }
  },
}
