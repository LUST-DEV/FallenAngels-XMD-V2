module.exports = {
  name: 'count',
  aliases: ['wordcount', 'wc', 'charcount', 'countwords'],
  desc: 'Count characters, words and lines in text',
  async run({ args, reply }) {
    const text = args.join(' ')
    if (!text) return reply('𝐔sᴀɢᴇ: .count <ᴛᴇxᴛ>')
    const words = text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []
    return reply(`╭─❮ 𓆩 𝐓ᴇxᴛ 𝐂ᴏᴜɴᴛ 𓆪 ❯\n│ 𝐂ʜᴀʀᴀᴄᴛᴇʀs: ${[...text].length}\n│ 𝐖ᴏʀᴅs: ${words.length}\n│ 𝐋ɪɴᴇs: ${text.split(/\r\n|\r|\n/).length}\n╰─────────────────────────`)
  },
}
