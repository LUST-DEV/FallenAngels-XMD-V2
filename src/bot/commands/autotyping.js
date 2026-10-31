const { User } = require('../../database')
const logger = require('../../logger')

module.exports = {
  name: 'autotyping',
  desc: 'Enable or disable the typing indicator',
  ownerOnly: true,
  async run({ args, numero, jid, sock, reply, prefix }) {
    const status = args[0]?.toLowerCase()
    if (!['on', 'off'].includes(status)) {
      return reply(`> ❌ 𝐔sᴀɢᴇ: ${prefix}autotyping on/off`)
    }

    const user = await User.findByPk(numero, { attributes: ['autotyping'] })
    if (!user) {
      throw new Error(`No user found for number: ${numero}.`)
    }
    await user.update({ autotyping: status === 'on' })

    if (status === 'on') {
      let typingStarted = false
      try {
        await sock.presenceSubscribe(jid)
        await sock.sendPresenceUpdate('composing', jid)
        typingStarted = true
        await new Promise((resolve) => setTimeout(resolve, 3000))
      } catch (error) {
        logger.warn({ numero, jid, err: error.message }, 'unable to show typing indicator after enabling autotyping')
      } finally {
        if (typingStarted) {
          try {
            await sock.sendPresenceUpdate('paused', jid)
          } catch (error) {
            logger.warn({ numero, jid, err: error.message }, 'unable to stop typing indicator after enabling autotyping')
          }
        }
      }
    }

    await reply(`> ⌨️ 𝐀ᴜᴛᴏ-ᴛʏᴘɪɴɢ: ${status === 'on' ? '𝐄ɴᴀʙʟᴇᴅ ✅' : '𝐃ɪsᴀʙʟᴇᴅ ❌'}`)
  },
}
