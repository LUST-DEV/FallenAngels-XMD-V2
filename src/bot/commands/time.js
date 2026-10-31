module.exports = {
  name: 'time',
  desc: 'Show the current time in an IANA time zone',
  async run({ args, reply }) {
    const zone = args.join(' ').trim()
    if (!zone || zone.length > 80 || !zone.includes('/')) {
      return reply('𝐔sᴀɢᴇ: .time <𝐀ʀᴇᴀ/𝐂ɪᴛʏ> (ᴇxᴀᴍᴘʟᴇ: America/Port-au-Prince)')
    }
    try {
      const date = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        dateStyle: 'full',
        timeStyle: 'long',
      })
      return reply(`╭─❮ 𓆩 𝐋ᴏᴄᴀʟ 𝐓ɪᴍᴇ 𓆪 ❯\n│ 𝐙ᴏɴᴇ: ${zone}\n│ ${formatter.format(date)}\n╰─────────────────────────`)
    } catch (error) {
      if (error instanceof RangeError) return reply('❌ 𝐔ɴᴋɴᴏᴡɴ ᴛɪᴍᴇ ᴢᴏɴᴇ. 𝐔sᴇ 𝐈𝐀𝐍𝐀 ғᴏʀᴍᴀᴛ, ᴇxᴀᴍᴘʟᴇ America/Port-au-Prince.')
      throw error
    }
  },
}
