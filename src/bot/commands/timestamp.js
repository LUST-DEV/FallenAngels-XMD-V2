module.exports = {
  name: 'timestamp',
  desc: 'Convert dates and Unix timestamps',
  async run({ args, reply }) {
    if (args.length === 0) {
      const now = Date.now()
      return reply(`╭─❮ 𓆩 𝐓ɪᴍᴇsᴛᴀᴍᴘ 𓆪 ❯\n│ 𝐔ɴɪx sᴇᴄᴏɴᴅs: ${Math.floor(now / 1000)}\n│ 𝐔ɴɪx ᴍɪʟʟɪsᴇᴄᴏɴᴅs: ${now}\n│ 𝐈𝐒𝐎: ${new Date(now).toISOString()}\n╰─────────────────────────`)
    }
    const value = args.join(' ').trim()
    let date
    if (/^\d{1,13}$/.test(value)) {
      const numeric = Number(value)
      date = new Date(value.length <= 10 ? numeric * 1000 : numeric)
    } else {
      date = new Date(value)
    }
    if (!Number.isFinite(date.getTime())) return reply('𝐔sᴀɢᴇ: .timestamp [ᴜɴɪx sᴇᴄᴏɴᴅs|ᴍɪʟʟɪsᴇᴄᴏɴᴅs|ᴅᴀᴛᴇ]')
    return reply(`╭─❮ 𓆩 𝐓ɪᴍᴇsᴛᴀᴍᴘ 𓆪 ❯\n│ 𝐔ɴɪx sᴇᴄᴏɴᴅs: ${Math.floor(date.getTime() / 1000)}\n│ 𝐔ɴɪx ᴍɪʟʟɪsᴇᴄᴏɴᴅs: ${date.getTime()}\n│ 𝐈𝐒𝐎: ${date.toISOString()}\n╰─────────────────────────`)
  },
}
