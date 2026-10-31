const { User } = require('../../database')

module.exports = {
  name: 'autostatus',
  desc: 'Automatically views contact statuses',
  ownerOnly: true,
  async run({ args, numero, reply, prefix }) {
    const user = await User.findByPk(numero, { attributes: ['autostatus', 'autoreact'] })
    if (!user) {
      throw new Error(`Nᴏ ᴜsᴇʀ ғᴏᴜɴᴅ ғᴏʀ ᴛʜᴇ ɴᴜᴍʙᴇʀ: ${numero}.`)
    }

    const [action, value] = args.map((arg) => arg.toLowerCase())
    if (!action) {
      return reply(
        '╭─❮ 𓆩 𝐀ᴜᴛᴏ 𝐒ᴛᴀᴛᴜs 𓆪 ❯\n' +
        `│ 🝐 𝐕ɪᴇᴡ ➪ ${user.autostatus ? '𝐎ɴ' : '𝐎ғғ'}\n` +
        `│ ⸸ 𝐑ᴇᴀᴄᴛ ➪ ${user.autoreact ? '𝐎ɴ' : '𝐎ғғ'}\n` +
        '╰─────────────────────────\n' +
        `\n𓆩 ${prefix}autostatus on/off\n𓆩 ${prefix}autostatus react on/off`,
      )
    }

    if (action === 'on' || action === 'off') {
      const enabled = action === 'on'
      await user.update({ autostatus: enabled })
      return reply(
        `╭─❮ 🝐 𝐀ᴜᴛᴏ 𝐒ᴛᴀᴛᴜs ❯\n` +
        `│ ⸸ 𝐀ᴜᴛᴏ-𝐕ɪᴇᴡ ➪ ${enabled ? '𝐄ɴᴀʙʟᴇᴅ' : '𝐃ɪsᴀʙʟᴇᴅ'}\n` +
        '╰─────────────────────────',
      )
    }

    if (action === 'react' && (value === 'on' || value === 'off') && args.length === 2) {
      const enabled = value === 'on'
      await user.update({ autoreact: enabled })
      return reply(
        `╭─❮ 🝐 𝐀ᴜᴛᴏ 𝐒ᴛᴀᴛᴜs ❯\n` +
        `│ ⸸ 𝐒ᴛᴀᴛᴜs 𝐑ᴇᴀᴄᴛ ➪ ${enabled ? '𝐄ɴᴀʙʟᴇᴅ 💚' : '𝐃ɪsᴀʙʟᴇᴅ'}\n` +
        '╰─────────────────────────',
      )
    }

    return reply(
      `╭─❮ ⸸ 𝐈ɴᴠᴀʟɪᴅ 𝐎ᴘᴛɪᴏɴ ❯\n` +
      `│ 🝓 ${prefix}autostatus on/off\n` +
      `│ 🝓 ${prefix}autostatus react on/off\n` +
      '╰─────────────────────────',
    )
  },
}
