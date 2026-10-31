const {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} = require('@whiskeysockets/baileys')
const { Op, fn, col, literal } = require('sequelize')
const { GroupActivity } = require('../../database')
const { participantNumber } = require('../groupUtils')
const { downloadImage } = require('../imageUtils')
const logger = require('../../logger')

module.exports = {
  name: 'topchat',
  desc: 'Show the most active group members today or this week',
  async run({ sock, jid, msg, args, reply, prefix }) {
    if (!jid.endsWith('@g.us')) return reply('> ❌ Use `.topchat` inside a group.')
    const period = (args[0] || 'today').toLowerCase()
    if (!['today', 'week'].includes(period)) {
      return reply(`> ❌ Usage: ${prefix}topchat [today|week]`)
    }

    const metadata = await sock.groupMetadata(jid)
    const days = period === 'week' ? 7 : 1
    const since = new Date()
    since.setUTCHours(0, 0, 0, 0)
    since.setUTCDate(since.getUTCDate() - days + 1)
    const rows = await GroupActivity.findAll({
      attributes: [
        'participantJid',
        [fn('SUM', col('messageCount')), 'messageCount'],
      ],
      where: {
        groupJid: jid,
        activityDate: { [Op.gte]: since.toISOString().slice(0, 10) },
      },
      group: ['participantJid'],
      order: [[literal('"messageCount"'), 'DESC']],
      limit: 10,
      raw: true,
    })

    const text = [
      `✖ ${metadata.subject || 'Group'} - ${period === 'week' ? 'This Week' : 'Today'}`,
      ...(rows.length
        ? rows.map((row, index) =>
          `${index + 1}. @${participantNumber(row.participantJid)} - ${Number(row.messageCount)} messages`,
        )
        : ['No activity recorded for this period yet.']),
    ].join('\n')

    let image
    try {
      const pictureUrl = await sock.profilePictureUrl(jid, 'image')
      image = await downloadImage(pictureUrl)
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'unable to load group picture for topchat')
    }

    const media = image
      ? await prepareWAMessageMedia(
        { image },
        {
          upload: sock.waUploadToServer,
          logger: sock.logger,
          userJid: sock.user?.id,
        },
      )
      : null
    const generated = generateWAMessageFromContent(jid, {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.create({
            header: proto.Message.InteractiveMessage.Header.create({
              hasMediaAttachment: Boolean(media),
              ...(media ? { imageMessage: media.imageMessage } : {}),
            }),
            body: proto.Message.InteractiveMessage.Body.create({ text }),
            contextInfo: { mentionedJid: rows.map((row) => row.participantJid) },
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
              buttons: [
                {
                  name: 'quick_reply',
                  buttonParamsJson: JSON.stringify({
                    display_text: 'Today',
                    id: `${prefix}topchat today`,
                  }),
                },
                {
                  name: 'quick_reply',
                  buttonParamsJson: JSON.stringify({
                    display_text: 'This week',
                    id: `${prefix}topchat week`,
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

    return sock.relayMessage(jid, generated.message, {
      messageId: generated.key.id,
      additionalNodes: [{
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
      }],
    })
  },
}
