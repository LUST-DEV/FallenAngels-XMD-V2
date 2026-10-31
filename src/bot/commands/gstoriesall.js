const { getStoryContent, sendStoryToAllGroups } = require('../groupStories')

module.exports = {
  name: 'gstoriesall',
  aliases: ['gstatutall', 'gstatusall'],
  desc: 'Share a status in all groups (owner)',
  ownerOnly: true,
  async run({ sock, msg, args, reply }) {
    const story = await getStoryContent(msg, args)
    if (!story) {
      return reply('> ❌ 𝐀ᴅᴅ ᴛᴇxᴛ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ, ᴠɪᴅᴇᴏ, ᴏʀ ᴀᴜᴅɪᴏ.')
    }

    return sendStoryToAllGroups(sock, story, reply)
  },
}
