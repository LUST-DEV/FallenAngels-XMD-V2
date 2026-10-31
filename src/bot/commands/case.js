const smallCaps = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ',
  i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ',
  q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x',
  y: 'ʏ', z: 'ᴢ',
}

module.exports = {
  name: 'case',
  desc: 'Change text casing',
  async run({ args, reply }) {
    const mode = args.shift()?.toLowerCase()
    const text = args.join(' ')
    if (!['upper', 'lower', 'title', 'small'].includes(mode) || !text) {
      return reply('𝐔sᴀɢᴇ: .case <ᴜᴘᴘᴇʀ|ʟᴏᴡᴇʀ|ᴛɪᴛʟᴇ|sᴍᴀʟʟ> <ᴛᴇxᴛ>')
    }
    const result = mode === 'upper'
      ? text.toLocaleUpperCase()
      : mode === 'lower'
        ? text.toLocaleLowerCase()
        : mode === 'small'
          ? [...text].map((character) => smallCaps[character.toLowerCase()] || character).join('')
          : text.replace(/\p{L}[\p{L}\p{M}]*/gu, (word) => (
            word[0].toLocaleUpperCase() + word.slice(1).toLocaleLowerCase()
          ))
    return reply(result)
  },
}
