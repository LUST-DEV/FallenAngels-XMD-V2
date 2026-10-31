const logger = require('../../logger')
const { UserNote } = require('../../database')
module.exports = {
  name: 'note',
  desc: 'Save, list and delete personal notes',
  async run({ args, numero, reply }) {
    const action = args.shift()?.toLowerCase()
    try {
      if (action === 'save') {
        const input = args.join(' ')
        const separator = input.indexOf('|')
        if (separator < 1) return reply('𝐔sᴀɢᴇ: .note save <ᴛɪᴛʟᴇ> | <ᴄᴏɴᴛᴇɴᴛ>')
        const title = input.slice(0, separator).trim()
        const content = input.slice(separator + 1).trim()
        if (!title || title.length > 80 || !content || content.length > 1000) {
          return reply('❌ 𝐍ᴏᴛᴇ ᴛɪᴛʟᴇs ᴍᴜsᴛ ʙᴇ 𝟣–𝟪𝟢 ᴄʜᴀʀᴀᴄᴛᴇʀs, ᴄᴏɴᴛᴇɴᴛ 𝟣–𝟣𝟢𝟢𝟢.')
        }
        const count = await UserNote.count({ where: { numero } })
        const existing = await UserNote.findOne({ where: { numero, title } })
        if (!existing && count >= 100) return reply('𝐘ᴏᴜ ʜᴀᴠᴇ ʀᴇᴀᴄʜᴇᴅ ᴛʜᴇ 𝟣𝟢𝟢-ɴᴏᴛᴇ ʟɪᴍɪᴛ.')
        const [note, created] = await UserNote.findOrCreate({
          where: { numero, title },
          defaults: { numero, title, content },
        })
        if (!created) await note.update({ content })
        return reply(`✅ 𝐍ᴏᴛᴇ "${title}" ${created ? 'sᴀᴠᴇᴅ' : 'ᴜᴘᴅᴀᴛᴇᴅ'} (#${note.id}).`)
      }
      if (action === 'list') {
        const notes = await UserNote.findAll({ where: { numero }, order: [['id', 'ASC']], limit: 100 })
        if (!notes.length) return reply('𝐍ᴏ sᴀᴠᴇᴅ ɴᴏᴛᴇs. 𝐔sᴇ .note save <ᴛɪᴛʟᴇ> | <ᴄᴏɴᴛᴇɴᴛ>.')
        return reply(`╭─❮ 𓆩 𝐒ᴀᴠᴇᴅ 𝐍ᴏᴛᴇs 𓆪 ❯\n${notes.map((note) => `#${note.id} ${note.title}`).join('\n')}\n╰─────────────────────────`)
      }
      if (action === 'delete') {
        const id = Number(args[0])
        if (!Number.isSafeInteger(id) || id < 1) return reply('𝐔sᴀɢᴇ: .note delete <ɪᴅ>')
        const deleted = await UserNote.destroy({ where: { id, numero } })
        return reply(deleted ? `✅ 𝐃ᴇʟᴇᴛᴇᴅ ɴᴏᴛᴇ #${id}.` : '❌ 𝐍ᴏᴛᴇ ɴᴏᴛ ғᴏᴜɴᴅ.')
      }
      return reply('𝐔sᴀɢᴇ: .note <sᴀᴠᴇ|ʟɪsᴛ|ᴅᴇʟᴇᴛᴇ> [ᴛɪᴛʟᴇ | ᴄᴏɴᴛᴇɴᴛ|ɪᴅ]')
    } catch (error) {
      logger.error({ numero, action, err: error }, 'note operation failed')
      return reply('❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ᴜᴘᴅᴀᴛᴇ ʏᴏᴜʀ ɴᴏᴛᴇs. 𝐓ʀʏ ᴀɢᴀɪɴ.')
    }
  },
}
