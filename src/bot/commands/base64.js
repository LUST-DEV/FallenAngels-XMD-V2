module.exports = {
  name: 'base64',
  desc: 'Encode or decode UTF-8 text with Base64',
  async run({ args, reply }) {
    const action = args.shift()?.toLowerCase()
    const text = args.join(' ')
    if (!['encode', 'decode'].includes(action) || !text || text.length > 4000) {
      return reply('𝐔sᴀɢᴇ: .base64 <ᴇɴᴄᴏᴅᴇ|ᴅᴇᴄᴏᴅᴇ> <ᴛᴇxᴛ>')
    }
    if (action === 'encode') return reply(Buffer.from(text, 'utf8').toString('base64'))
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text)) {
      return reply('❌ 𝐈ɴᴠᴀʟɪᴅ 𝐁ᴀsᴇ𝟨𝟦 ɪɴᴘᴜᴛ.')
    }
    const decoded = Buffer.from(text, 'base64')
    if (decoded.toString('base64') !== text || !Buffer.from(decoded.toString('utf8'), 'utf8').equals(decoded)) {
      return reply('❌ 𝐈ɴᴠᴀʟɪᴅ 𝐁ᴀsᴇ𝟨𝟦 ɪɴᴘᴜᴛ ᴏʀ 𝐔𝐓𝐅-𝟪 ᴛᴇxᴛ.')
    }
    return reply(decoded.toString('utf8'))
  },
}
