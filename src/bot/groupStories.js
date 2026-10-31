const { downloadContentFromMessage, normalizeMessageContent } = require('@whiskeysockets/baileys')
const logger = require('../logger')

async function downloadMedia(message, type) {
  const stream = await downloadContentFromMessage(message, type)
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

function quotedText(message) {
  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    ''
  )
}

async function getStoryContent(msg, args) {
  const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
  const quotedContent = quotedMessage ? normalizeMessageContent(quotedMessage) : null
  const text = args.join(' ').trim() || quotedText(quotedContent).trim()
  const mediaEntry = quotedContent && [
    ['imageMessage', 'image'],
    ['videoMessage', 'video'],
    ['audioMessage', 'audio'],
  ].find(([key]) => quotedContent[key])

  if (!text && !mediaEntry) return null

  if (!mediaEntry) return { text }

  const [messageKey, mediaType] = mediaEntry
  const media = await downloadMedia(quotedContent[messageKey], mediaType)
  return { text, media, mediaType }
}

async function sendStoryToGroup(sock, groupId, { text, media, mediaType }) {
  const contextInfo = {
    isGroupStatus: true,
  }

  let content
  if (!media) {
    content = { text, backgroundColor: '#14161a', contextInfo }
  } else if (mediaType === 'image') {
    content = { image: media, caption: text, contextInfo }
  } else if (mediaType === 'video') {
    content = { video: media, caption: text, contextInfo }
  } else {
    content = { audio: media, mimetype: 'audio/mp4', ptt: false, contextInfo }
  }

  await sock.sendMessage(groupId, content)
  if (mediaType === 'audio' && text) {
    await sock.sendMessage(groupId, { text, contextInfo })
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendStoryToAllGroups(sock, story, reply) {
  let groups
  try {
    groups = await sock.groupFetchAllParticipating()
  } catch (error) {
    logger.error({ err: error.message }, 'unable to retrieve group list for gstoriesall')
    return reply('> ❌ 𝐔ɴᴀʙʟᴇ ᴛᴏ ʀᴇᴛʀɪᴇᴠᴇ ᴛʜᴇ ɢʀᴏᴜᴘ ʟɪsᴛ.')
  }

  const groupIds = Object.keys(groups)
  if (groupIds.length === 0) {
    return reply('> ⚠️ 𝐍ᴏ ɢʀᴏᴜᴘs ᴀᴠᴀɪʟᴀʙʟᴇ ғᴏʀ ᴛʜɪs ᴅᴇᴠɪᴄᴇ.')
  }

  await reply(`> 🚀 𝐒ᴇɴᴅɪɴɢ ᴛʜᴇ sᴛᴀᴛᴜs ᴛᴏ ${groupIds.length} ɢʀᴏᴜᴘ(s)…`)

  let successCount = 0
  const failures = []

  for (const groupId of groupIds) {
    try {
      await sendStoryToGroup(sock, groupId, story)
      successCount++
    } catch (error) {
      failures.push(groupId)
      logger.warn({ groupId, err: error.message }, 'gstoriesall failed for group')
    }

    if (successCount + failures.length < groupIds.length) {
      await wait(2000)
    }
  }

  const failureSummary = failures.length
    ? `\n❌ 𝐅ᴀɪʟᴇᴅ ɪɴ ${failures.length} ɢʀᴏᴜᴘ(s).`
    : ''
  await reply(`> ✅ 𝐒ᴛᴀᴛᴜs sᴇɴᴛ ᴛᴏ ${successCount}/${groupIds.length} ɢʀᴏᴜᴘ(s).${failureSummary}`)
}

module.exports = { getStoryContent, sendStoryToGroup, sendStoryToAllGroups }
