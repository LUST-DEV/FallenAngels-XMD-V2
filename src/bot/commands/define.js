const logger = require('../../logger')
module.exports = {
  name: 'define',
  desc: 'Look up an English word definition',
  async run({ args, reply }) {
    const word = args.join(' ').trim()
    if (!word || word.length > 80 || !/^[\p{L}' -]+$/u.test(word)) {
      return reply('𝐔sᴀɢᴇ: .define <ᴇɴɢʟɪsʜ ᴡᴏʀᴅ>')
    }
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      })
      if (response.status === 404) return reply(`❌ 𝐍ᴏ ᴅᴇғɪɴɪᴛɪᴏɴ ғᴏᴜɴᴅ ғᴏʀ "${word}".`)
      if (!response.ok) throw new Error(`Dictionary returned HTTP ${response.status}.`)
      const entries = await response.json()
      const definitions = (Array.isArray(entries) ? entries : [])
        .flatMap((entry) => (entry.meanings || []).flatMap((meaning) => (
          (meaning.definitions || []).map((definition) => ({
            part: meaning.partOfSpeech,
            text: definition.definition,
            example: definition.example,
          }))
        )))
        .slice(0, 3)
      if (!definitions.length) throw new Error('Dictionary returned no definitions.')
      return reply(`${word}\n${definitions.map((item, index) => (
        `│ ${index + 1}. ${item.part ? `(${item.part}) ` : ''}${item.text}${item.example ? `\n│    𝐄xᴀᴍᴘʟᴇ: ${item.example}` : ''}`
      )).join('\n')}\n╰─────────────────────────`)
    } catch (error) {
      logger.warn({ word, err: error.message }, 'dictionary lookup failed')
      return reply('❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ғᴇᴛᴄʜ ᴛʜᴀᴛ ᴅᴇғɪɴɪᴛɪᴏɴ. 𝐓ʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.')
    }
  },
}
