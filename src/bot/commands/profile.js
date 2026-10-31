const { mentionedParticipants, participantNumber } = require('../groupUtils')
const { downloadImage } = require('../imageUtils')
const logger = require('../../logger')

module.exports = {
  name: 'profile',
  aliases: ['me'],
  desc: 'Show your profile or a mentioned group member',
  async run({ sock, msg, jid, reply }) {
    const targets = mentionedParticipants(msg)
    const target = targets[0] || (msg.key.fromMe ? sock.user?.id : msg.key.participant || jid)
    if (!target) return reply('> Cᴏᴜʟᴅ ɴᴏᴛ ᴅᴇᴛᴇʀᴍɪɴᴇ ᴛʜᴇ ᴘʀᴏғɪʟᴇ ᴜsᴇʀ.')

    let role = 'Dɪʀᴇᴄᴛ ᴄᴏɴᴛᴀᴄᴛ'
    if (jid.endsWith('@g.us')) {
      const metadata = await sock.groupMetadata(jid)
      const participant = (metadata.participants || []).find((entry) =>
        entry.id === target || entry.jid === target || entry.lid === target,
      )
      if (participant?.admin === 'admin' || participant?.admin === 'superadmin') role = 'Gʀᴏᴜᴘ ᴀᴅᴍɪɴ'
      else if (participant) role = 'Gʀᴏᴜᴘ ᴍᴇᴍʙᴇʀ'
    }

    const name = target === (msg.key.participant || jid) && msg.pushName
      ? msg.pushName
      : participantNumber(target)
    const text = `👤 𝐏ʀᴏғɪʟᴇ\n✦ Nᴀᴍᴇ: ${name}\n✦ 𝐍ᴜᴍʙᴇʀ: +${participantNumber(target)}\n✦ 𝐑ᴏʟᴇ: ${role}`
    let image
    try {
      const pictureUrl = await sock.profilePictureUrl(target, 'image')
      image = await downloadImage(pictureUrl)
    } catch (error) {
      logger.warn({ jid, target, err: error.message }, 'unable to load profile picture for profile command')
    }

    if (image) {
      await sock.sendMessage(jid, {
        image,
        caption: text,
        mentions: targets.length ? [target] : [],
      }, { quoted: msg })
    } else {
      await sock.sendMessage(jid, {
        text,
        mentions: targets.length ? [target] : [],
      }, { quoted: msg })
    }

    const { sendButtons } = await import('baileys_helpers')
    return sendButtons(sock, jid, {
      title: 'Profile',
      text: 'Copy this contact ID:',
      footer: name,
      buttons: [{
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({
          display_text: 'Copy ID',
          copy_code: target,
        }),
      }],
    }, { quoted: msg })
  },
}
