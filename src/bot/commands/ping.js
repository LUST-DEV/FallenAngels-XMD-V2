const fs = require('node:fs')
const path = require('node:path')
const {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} = require('@whiskeysockets/baileys')
const stats = require('../../utils/stats')
const config = require('../../config')
const logger = require('../../logger')
const { sessions } = require('../sessionManager')

module.exports = {
  name: 'ping',
  aliases: ['p'],
  desc: 'Latence et stats système',
  async run({ sock, jid, msg, prefix }) {
    try {
      const start = process.hrtime.bigint()
      await sock.sendMessage(jid, { react: { text: '🏓', key: msg.key } })
      const ms = Number(process.hrtime.bigint() - start) / 1e6
      const cpu = await stats.cpuUsage()
      const image = await fs.promises.readFile(path.join(config.assetsDir, 'ping.jpg'))
      const media = await prepareWAMessageMedia(
        { image },
        {
          upload: sock.waUploadToServer,
          logger: sock.logger,
          userJid: sock.user?.id,
        }
      )
      const text = [
        `> 🏓 𝐏ᴏɴɢ : ${ms.toFixed(3)}ᴍs`,
        '',
        `${config.botName} ♪ sʏsᴛᴇᴍ sᴛᴀᴛs`,
        '',
        `↬ \`𝐔ᴘᴛɪᴍᴇ\` : ${stats.uptime()}`,
        `↬ \`𝐑ᴀᴍ\` : ${stats.ramUsage().toFixed(1)}%`,
        `↬ \`𝐂ᴘᴜ\` : ${cpu.toFixed(1)}%`,
        `↬ \`𝐃ɪsᴋ\` : ${stats.diskUsage().toFixed(1)}%`,
        `↬ \`𝐒ᴇssɪᴏɴs\` : ${sessions.size}`,
      ].join('\n')
      const generated = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
          message: {
            interactiveMessage: proto.Message.InteractiveMessage.create({
              header: proto.Message.InteractiveMessage.Header.create({
                hasMediaAttachment: true,
                imageMessage: media.imageMessage,
              }),
              body: proto.Message.InteractiveMessage.Body.create({ text }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: '🚀 Rᴜɴᴛɪᴍᴇ',
                      id: `${prefix}runtime`,
                    }),
                  },
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: ' ⏱ Uᴘᴛɪᴍᴇ',
                      id: `${prefix}uptime`,
                    }),
                  },
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: '🏓 Pɪɴɢ',
                      id: `${prefix}ping`,
                    }),
                  },
                ],
              }),
            }),
          },
        },
      }, {
        logger: sock.logger,
        userJid: sock.user?.id,
        quoted: msg,
      })

      const additionalNodes = [{
        tag: 'biz',
        attrs: {},
        content: [{
          tag: 'interactive',
          attrs: { type: 'native_flow', v: '1' },
          content: [{
            tag: 'native_flow',
            attrs: { v: '9', name: 'mixed' },
          }],
        }],
      }]
      if (!jid.endsWith('@g.us')) {
        additionalNodes.push({ tag: 'bot', attrs: { biz_bot: '1' } })
      }

      await sock.relayMessage(jid, generated.message, {
        messageId: generated.key.id,
        additionalNodes,
      })
    } catch (error) {
      logger.error({ jid, err: error }, 'ping image and buttons could not be sent')
      throw error
    }
  },
}
