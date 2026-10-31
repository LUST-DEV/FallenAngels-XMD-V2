const logger = require('../../logger')
const { getStoryContent, sendStoryToGroup } = require('../groupStories')

module.exports = {
  name: 'gstories',
  desc: 'Share a status in the current group (owner)',
  ownerOnly: true,
  async run({ sock, msg, args, reply }) {
    const story = await getStoryContent(msg, args)
    if (!story) {
      return reply('> ❌ 𝐀ᴅᴅ ᴛᴇxᴛ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ, ᴠɪᴅᴇᴏ, ᴏʀ ᴀᴜᴅɪᴏ.')
    }

    const groupId = msg.key.remoteJid
    if (!groupId?.endsWith('@g.us')) {
      return reply('> ❌ 𝐔sᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ɪɴ ᴀ ɢʀᴏᴜᴘ.')
    }

    try {
      await sendStoryToGroup(sock, groupId, story)
      return reply('> ✅ 𝐒ᴛᴀᴛᴜs sᴇɴᴛ ᴛᴏ ᴛʜɪs ɢʀᴏᴜᴘ.')
    } catch (error) {
      logger.error({ groupId, err: error.message }, 'gstories failed for current group')
      return reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ sᴇɴᴅ ᴛʜᴇ sᴛᴀᴛᴜs ᴛᴏ ᴛʜɪs ɢʀᴏᴜᴘ.')
    }
  },
}
