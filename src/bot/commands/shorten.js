const logger = require('../../logger')

module.exports = {
  name: 'shorten',
  desc: 'Shorten an HTTP or HTTPS URL',
  async run({ sock, args, reply, jid, msg }) {
    await sock.sendMessage(jid, { react: { text: '🖇', key: msg.key } })
    const input = args[0]
    let target
    try {
      target = new URL(input)
    } catch {
      return reply('> ❌ 𝐔sᴀɢᴇ: .shorten <ʜᴛᴛᴘs://ᴜʀʟ>')
    }

    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.href.length > 2048) {
      return reply('> ❌ 𝐏ʀᴏᴠɪᴅᴇ ᴀ ᴠᴀʟɪᴅ 𝐇𝐓𝐓𝐏 ᴏʀ 𝐇𝐓𝐓𝐏𝐒 ʟɪɴᴋ (ᴍᴀx 𝟤𝟢𝟦𝟪 ᴄʜᴀʀᴀᴄᴛᴇʀs).')
    }

    let shortUrl
    try {
      const endpoint = new URL('https://is.gd/create.php')
      endpoint.searchParams.set('format', 'simple')
      endpoint.searchParams.set('url', target.href)
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(15_000) })
      if (!response.ok) throw new Error(`URL shortener returned HTTP ${response.status}.`)

      const result = (await response.text()).trim()
      try {
        shortUrl = new URL(result)
      } catch {
        throw new Error(`URL shortener rejected the link: ${result.slice(0, 150)}`)
      }
      if (shortUrl.protocol !== 'https:' || shortUrl.hostname !== 'is.gd') {
        throw new Error('URL shortener returned an unexpected URL.')
      }

    } catch (error) {
      logger.warn({ err: error.message }, 'URL shortening failed')
      return await reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ sʜᴏʀᴛᴇɴ ᴛʜɪs ʟɪɴᴋ.')
    }

    const shortLink = shortUrl.toString()
    const { sendButtons } = await import('baileys_helpers')
    return sendButtons(sock, jid, {
      title: 'URL Shortener',
      text: [
        '╭─❮ ❍ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs ❍ ❯',
        '│ 𖤐 𝐔𝐑𝐋 𝐒ʜᴏʀᴛᴇɴᴇʀ',
        '│',
        `│ ✦ 𝐒ʜᴏʀᴛ 𝐔𝐑𝐋: ${shortLink}`,
        '╰┄┄┄┄┄┄┄┄┄┄┄⪼',
      ].join('\n'),
      footer: 'Tap the button below to copy the short link.',
      buttons: [{
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({
          display_text: 'Copy link',
          copy_code: shortLink,
        }),
      }],
    }, { quoted: msg })
  },
}
