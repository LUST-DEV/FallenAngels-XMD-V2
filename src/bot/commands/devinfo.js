const config = require('../../config')
const logger = require('../../logger')

function getDeveloperNumber() {
  const contactUrl = new URL(config.developerContact)
  const phoneNumber = contactUrl.pathname.replace(/\D/g, '')
  if (
    contactUrl.protocol !== 'https:' ||
    contactUrl.hostname.toLowerCase() !== 'wa.me' ||
    !/^\d{7,15}$/.test(phoneNumber)
  ) {
    throw new Error('config.developerContact must be a valid https://wa.me/<number> URL.')
  }

  return phoneNumber
}

module.exports = {
  name: 'devinfo',
  desc: 'Send the developer contact',
  async run({ sock, jid }) {
    try {
      const phoneNumber = getDeveloperNumber()
      await sock.sendMessage(jid, {
        contacts: {
          displayName: 'Angels Developper',
          contacts: [{
            vcard: [
              'BEGIN:VCARD',
              'VERSION:3.0',
              'FN:Developer',
              `TEL;type=CELL;waid=${phoneNumber}:+${phoneNumber}`,
              'END:VCARD',
            ].join('\n'),
          }],
        },
      })
    } catch (error) {
      logger.error({ jid, err: error }, 'developer contact could not be sent')
      throw error
    }
  },
}
