const logger = require('../../logger')
const { UserTodo } = require('../../database')

module.exports = {
  name: 'todo',
  desc: 'Save and complete personal to-do items',
  async run({ args, numero, reply }) {
    const action = args.shift()?.toLowerCase()
    try {
      if (action === 'add') {
        const text = args.join(' ').trim()
        if (!text || text.length > 300) return reply('𝐔sᴀɢᴇ: .todo <ᴀᴅᴅ|ʟɪsᴛ|ᴅᴏɴᴇ> [ᴛᴇxᴛ|ɪᴅ]')
        const count = await UserTodo.count({ where: { numero } })
        if (count >= 100) return reply('𝐘ᴏᴜʀ ᴛᴏ-ᴅᴏ ʟɪsᴛ ɪs ғᴜʟʟ (𝟣𝟢𝟢 ɪᴛᴇᴍs).')
        const todo = await UserTodo.create({ numero, text })
        return reply(`✅ 𝐀ᴅᴅᴇᴅ #${todo.id}: ${todo.text}`)
      }
      if (action === 'list') {
        const todos = await UserTodo.findAll({ where: { numero }, order: [['id', 'ASC']], limit: 100 })
        if (!todos.length) return reply('𝐘ᴏᴜʀ ᴛᴏ-ᴅᴏ ʟɪsᴛ ɪs ᴇᴍᴘᴛʏ. 𝐔sᴇ .todo add <ᴛᴀsᴋ>.')
        return reply(`╭─❮ 𓆩 𝐘ᴏᴜʀ 𝐓ᴏ-𝐃ᴏ 𝐋ɪsᴛ 𓆪 ❯\n${todos.map((todo) => `${todo.completed ? '✅' : '▫️'} #${todo.id} ${todo.text}`).join('\n')}\n╰─────────────────────────`)
      }
      if (action === 'done') {
        const id = Number(args[0])
        if (!Number.isSafeInteger(id) || id < 1) return reply('𝐔sᴀɢᴇ: .todo done <ɪᴅ>')
        const todo = await UserTodo.findOne({ where: { id, numero } })
        if (!todo) return reply('❌ 𝐓ʜᴀᴛ ᴛᴏ-ᴅᴏ ɪᴛᴇᴍ ᴡᴀs ɴᴏᴛ ғᴏᴜɴᴅ.')
        if (todo.completed) return reply(`𝐓ᴏ-ᴅᴏ #${id} ɪs ᴀʟʀᴇᴀᴅʏ ᴄᴏᴍᴘʟᴇᴛᴇ.`)
        await todo.update({ completed: true })
        return reply(`✅ 𝐂ᴏᴍᴘʟᴇᴛᴇᴅ #${id}: ${todo.text}`)
      }
      return reply('𝐔sᴀɢᴇ: .todo <ᴀᴅᴅ|ʟɪsᴛ|ᴅᴏɴᴇ> [ᴛᴇxᴛ|ɪᴅ]')
    } catch (error) {
      logger.error({ numero, action, err: error }, 'to-do operation failed')
      return reply('❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ᴜᴘᴅᴀᴛᴇ ʏᴏᴜʀ ʟɪsᴛ. 𝐓ʀʏ ᴀɢᴀɪɴ.')
    }
  },
}
