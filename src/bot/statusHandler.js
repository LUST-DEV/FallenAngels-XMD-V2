const { User } = require('../database')
const logger = require('../logger')

async function handleStatusMessage(sock, numero, msg) {
  if (msg.key.fromMe) return

  let settings
  try {
    settings = await User.findByPk(numero, {
      attributes: ['autostatus', 'autoreact'],
    })
  } catch (error) {
    logger.error({ numero, jid: msg.key.remoteJid, err: error.message }, 'failed to load automatic status settings')
    return
  }

  if (settings?.autostatus && msg.key.id) {
    try {
      await sock.readMessages([msg.key])
    } catch (error) {
      logger.error({ numero, jid: msg.key.remoteJid, messageId: msg.key.id, err: error.message }, 'failed to automatically view status')
    }
  }

  const statusParticipant = msg.key.participant || msg.participant
  if (settings?.autoreact && msg.key.id && statusParticipant) {
    try {
      await sock.sendMessage(
        'status@broadcast',
        { react: { text: '💚', key: msg.key } },
        { statusJidList: [statusParticipant] },
      )
    } catch (error) {
      logger.error({ numero, jid: msg.key.remoteJid, participant: statusParticipant, err: error.message }, 'failed to automatically react to status')
    }
  }
}

module.exports = { handleStatusMessage }
