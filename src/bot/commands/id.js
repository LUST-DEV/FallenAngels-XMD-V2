const { normalizeMessageContent } = require('@whiskeysockets/baileys')

function formatIdCard(lines) {
  return [
    '╭─❮ 𓆩 𝐖ʜᴀᴛsAᴘᴘ 𝐈ᴅ 𓆪 ❯',
    ...lines.map((line) => `│ ✠ ${line}`),
    '╰─────────────────────────',
  ].join('\n')
}

function getQuotedJid(msg) {
  const content = normalizeMessageContent(msg.message || {})
  const context = content.extendedTextMessage?.contextInfo ||
    content.imageMessage?.contextInfo ||
    content.videoMessage?.contextInfo ||
    content.documentMessage?.contextInfo
  return context?.participant || context?.participantAlt || null
}

function parseWhatsAppLink(input) {
  let url
  try {
    url = new URL(input)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const segments = url.pathname.split('/').filter(Boolean)
  if (host === 'chat.whatsapp.com' && segments[0]) {
    return { type: 'group', code: segments[0] }
  }
  if ((host === 'whatsapp.com' || host === 'wa.me') &&
    segments[0]?.toLowerCase() === 'channel' && segments[1]) {
    return { type: 'channel', code: segments[1] }
  }

  return null
}

async function sendCopyableId(sock, msg, jid, lines, value, buttonLabel = 'Copy ID') {
  const payload = formatIdCard(lines)
  if (!value) return sock.sendMessage(jid, { text: payload }, { quoted: msg })

  const { sendButtons } = await import('baileys_helpers')
  return sendButtons(sock, jid, {
    title: 'WhatsApp ID details',
    text: payload,
    footer: 'Tap the button below to copy this ID.',
    buttons: [{
      name: 'cta_copy',
      buttonParamsJson: JSON.stringify({
        display_text: buttonLabel,
        copy_code: value,
      }),
    }],
  }, { quoted: msg })
}

module.exports = {
  name: 'id',
  desc: 'Show WhatsApp JIDs for this chat, a contact, group, or channel link',
  async run({ sock, msg, jid, args, reply, prefix }) {
    const input = args.join(' ').trim()
    if (args.length > 1 && !input.includes('://')) {
      return reply(`> ❌ 𝐔sᴀɢᴇ: ${prefix}id [reply / number / group link / channel link]`)
    }

    const link = input ? parseWhatsAppLink(input) : null
    if (input && !link && !input.endsWith('@g.us') && !input.endsWith('@newsletter') &&
      !input.endsWith('@s.whatsapp.net') && !input.endsWith('@lid') &&
      !/^\+?\d{7,15}$/.test(input)) {
      return reply(`> ❌ 𝐔sᴇ ᴀ ɴᴜᴍʙᴇʀ, ᴀ ᴄᴏɴᴛᴀᴄᴛ ʀᴇᴘʟʏ, ᴀ ɢʀᴏᴜᴘ ʟɪɴᴋ ᴏʀ ᴀ ᴄʜᴀɴɴᴇʟ ʟɪɴᴋ.\n𝐄xᴀᴍᴘʟᴇ: ${prefix}id +15551234567`)
    }

    if (link?.type === 'group') {
      try {
        const group = await sock.groupGetInviteInfo(link.code)
        const jidValue = group.id || 'Unavailable'
        return sendCopyableId(sock, msg, jid, [
          '𝐓ʏᴘᴇ ➪ 𝐆ʀᴏᴜᴘ',
          `𝐍ᴀᴍᴇ ➪ ${group.subject || 'Unknown'}`,
          `𝐉𝐈𝐃 ➪ ${jidValue}`,
          `𝐌ᴇᴍʙᴇʀs ➪ ${group.participants?.length ?? 'Unknown'}`,
        ], group.id)
      } catch (error) {
        return reply(`> ❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ʀᴇᴀᴅ ᴛʜᴇ ɢʀᴏᴜᴘ ɪɴᴠɪᴛᴇ ʟɪɴᴋ: ${error.message}`)
      }
    }

    if (link?.type === 'channel') {
      try {
        const channel = await sock.newsletterMetadata('invite', link.code)
        if (!channel?.id) throw new Error('Channel details were not returned.')
        return sendCopyableId(sock, msg, jid, [
          '𝐓ʏᴘᴇ ➪ 𝐂ʜᴀɴɴᴇʟ',
          `𝐍ᴀᴍᴇ ➪ ${channel.name || 'Unknown'}`,
          `𝐉𝐈𝐃 ➪ ${channel.id}`,
          `𝐒ᴜʙsᴄʀɪʙᴇʀs ➪ ${channel.subscribers ?? 'Unknown'}`,
        ], channel.id)
      } catch (error) {
        return reply(`> ❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ʀᴇᴀᴅ ᴛʜᴇ ᴄʜᴀɴɴᴇʟ ɪɴᴠɪᴛᴇ ʟɪɴᴋ: ${error.message}`)
      }
    }

    if (input.endsWith('@g.us')) {
      try {
        const group = await sock.groupMetadata(input)
        return sendCopyableId(sock, msg, jid, [
          '𝐓ʏᴘᴇ ➪ 𝐆ʀᴏᴜᴘ',
          `𝐍ᴀᴍᴇ ➪ ${group.subject || 'Unknown'}`,
          `𝐉𝐈𝐃 ➪ ${input}`,
          `𝐌ᴇᴍʙᴇʀs ➪ ${group.participants?.length ?? 'Unknown'}`,
        ], input)
      } catch {
        return sendCopyableId(sock, msg, jid, ['𝐓ʏᴘᴇ ➪ 𝐆ʀᴏᴜᴘ', `𝐉𝐈𝐃 ➪ ${input}`], input)
      }
    }

    if (input.endsWith('@newsletter')) {
      try {
        const channel = await sock.newsletterMetadata('jid', input)
        return sendCopyableId(sock, msg, jid, [
          '𝐓ʏᴘᴇ ➪ 𝐂ʜᴀɴɴᴇʟ',
          `𝐍ᴀᴍᴇ ➪ ${channel?.name || 'Unknown'}`,
          `𝐉𝐈𝐃 ➪ ${input}`,
          `𝐒ᴜʙsᴄʀɪʙᴇʀs ➪ ${channel?.subscribers ?? 'Unknown'}`,
        ], input)
      } catch (error) {
        return reply(`> ❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ʀᴇᴀᴅ ᴛʜᴇ ᴄʜᴀɴɴᴇʟ: ${error.message}`)
      }
    }

    if (input.endsWith('@s.whatsapp.net') || input.endsWith('@lid')) {
      return sendCopyableId(sock, msg, jid, [
        `𝐓ʏᴘᴇ ➪ ${input.endsWith('@lid') ? '𝐋ɪɴᴋᴇᴅ 𝐈ᴅ' : '𝐂ᴏɴᴛᴀᴄᴛ'}`,
        `𝐉𝐈𝐃 ➪ ${input}`,
      ], input)
    }

    if (/^\+?\d{7,15}$/.test(input)) {
      const phoneNumber = input.replace(/\D/g, '')
      const contactJid = `${phoneNumber}@s.whatsapp.net`
      return sendCopyableId(sock, msg, jid, [
        '𝐓ʏᴘᴇ ➪ 𝐂ᴏɴᴛᴀᴄᴛ',
        `𝐍ᴜᴍʙᴇʀ ➪ +${phoneNumber}`,
        `𝐉𝐈𝐃 ➪ ${contactJid}`,
      ], contactJid)
    }

    const quotedJid = getQuotedJid(msg)
    if (quotedJid) {
      return sendCopyableId(sock, msg, jid, [
        '𝐓ʏᴘᴇ ➪ 𝐑ᴇᴘʟɪᴇᴅ 𝐂ᴏɴᴛᴀᴄᴛ',
        `𝐉𝐈𝐃 ➪ ${quotedJid}`,
      ], quotedJid)
    }

    if (jid?.endsWith('@g.us')) {
      try {
        const group = await sock.groupMetadata(jid)
        return sendCopyableId(sock, msg, jid, [
          '𝐓ʏᴘᴇ ➪ 𝐆ʀᴏᴜᴘ',
          `𝐍ᴀᴍᴇ ➪ ${group.subject || 'Unknown'}`,
          `𝐉𝐈𝐃 ➪ ${jid}`,
          `𝐌ᴇᴍʙᴇʀs ➪ ${group.participants?.length ?? 'Unknown'}`,
        ], jid)
      } catch {
        return sendCopyableId(sock, msg, jid, ['𝐓ʏᴘᴇ ➪ 𝐆ʀᴏᴜᴘ', `𝐉𝐈𝐃 ➪ ${jid}`], jid)
      }
    }

    if (jid?.endsWith('@newsletter')) {
      return sendCopyableId(sock, msg, jid, ['𝐓ʏᴘᴇ ➪ 𝐂ʜᴀɴɴᴇʟ', `𝐉𝐈𝐃 ➪ ${jid}`], jid)
    }

    const contactJid = msg.key.fromMe ? sock.user?.id || jid : msg.key.participant || jid
    return sendCopyableId(sock, msg, jid, [
      '𝐓ʏᴘᴇ ➪ 𝐂ᴏɴᴛᴀᴄᴛ',
      `𝐉𝐈𝐃 ➪ ${contactJid}`,
    ], contactJid)
  },
}
