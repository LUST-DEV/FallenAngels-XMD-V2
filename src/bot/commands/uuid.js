const { randomUUID } = require('node:crypto')

module.exports = {
  name: 'uuid',
  desc: 'Generate a random UUID',
  async run({ sock, jid, msg }) {
    const uuid = randomUUID()
    const { sendButtons } = await import('baileys_helpers')
    return sendButtons(sock, jid, {
      title: 'Random UUID',
      text: `╭─❮ 𓆩 𝐑ᴀɴᴅᴏᴍ 𝐔𝐔𝐈𝐃 𓆪 ❯\n│ ${uuid}\n╰─────────────────────────`,
      footer: 'Tap the button below to copy the UUID.',
      buttons: [{
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({
          display_text: 'Copy UUID',
          copy_code: uuid,
        }),
      }],
    }, { quoted: msg })
  },
}
