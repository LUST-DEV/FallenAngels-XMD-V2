const logger = require('../../logger')

const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

function extractUrl(text) {
  const match = String(text || '').match(/https?:\/\/[^\s<>]+/i)
  return match ? match[0].replace(/[),.!?]+$/, '') : ''
}

function isFacebookUrl(value) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    const validHost = hostname === 'fb.watch' ||
      hostname === 'fb.com' ||
      hostname === 'facebook.com' ||
      hostname.endsWith('.facebook.com')

    return (url.protocol === 'https:' || url.protocol === 'http:') &&
      validHost &&
      !url.username &&
      !url.password
  } catch {
    return false
  }
}

function getDownloadInfo(data) {
  const result = data?.result
  const media = result?.media
  const download = [
    media?.video_hd,
    media?.video_sd,
    result?.url,
    result?.download,
    result?.video,
    data?.data?.url,
    data?.data?.download,
    data?.url,
    data?.download,
    typeof result === 'string' ? result : null,
  ].find((candidate) => typeof candidate === 'string' && /^https?:\/\//i.test(candidate))

  if (!download) throw new Error('Facebook downloader returned no video URL')

  return {
    download,
    title: result?.info?.title || result?.title || data?.title || 'Facebook Video',
  }
}

async function fetchVideoBuffer(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'video/mp4,video/*,application/octet-stream,*/*',
      'User-Agent': USER_AGENT,
      Referer: 'https://www.facebook.com/',
    },
    signal: AbortSignal.timeout(120_000),
  })

  if (!response.ok) throw new Error(`Facebook video download failed with HTTP ${response.status}`)
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_SIZE) {
    throw new Error('Facebook video exceeds the 100 MB limit')
  }

  const chunks = []
  let totalSize = 0
  for await (const chunk of response.body) {
    totalSize += chunk.length
    if (totalSize > MAX_VIDEO_SIZE) {
      await response.body.cancel()
      throw new Error('Facebook video exceeds the 100 MB limit')
    }
    chunks.push(chunk)
  }

  if (!totalSize) throw new Error('Facebook video download was empty')
  return Buffer.concat(chunks, totalSize)
}

async function downloadFacebook(url) {
  const endpoint = new URL('https://api.hanggts.xyz/download/facebook')
  endpoint.searchParams.set('url', url)
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) throw new Error(`Facebook downloader failed with HTTP ${response.status}`)

  const info = getDownloadInfo(await response.json())
  return {
    ...info,
    buffer: await fetchVideoBuffer(info.download),
  }
}

module.exports = {
  name: 'facebook',
  aliases: ['fb', 'facebookdl'],
  desc: 'Download a Facebook video from a link',
  async run({ sock, jid, msg, args, reply }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const text = args.join(' ') || quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const url = extractUrl(text)

    if (!url) {
      return reply('> ❌ 𝐏ʀᴏᴠɪᴅᴇ ᴀ 𝐅ᴀᴄᴇʙᴏᴏᴋ ᴠɪᴅᴇᴏ ʟɪɴᴋ. 𝐄xᴀᴍᴘʟᴇ: .fb https://www.facebook.com/reel/...')
    }
    if (!isFacebookUrl(url)) {
      return reply('> ❌ 𝐓ʜᴀᴛ ɪs ɴᴏᴛ ᴀ ᴠᴀʟɪᴅ 𝐅ᴀᴄᴇʙᴏᴏᴋ ʟɪɴᴋ.')
    }

    try {
      await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } })
    } catch (error) {
      logger.debug({ jid, err: error.message }, 'unable to show Facebook download reaction')
    }

    try {
      const video = await downloadFacebook(url)
      const title = String(video.title).slice(0, 180)
      await sock.sendMessage(jid, {
        video: video.buffer,
        mimetype: 'video/mp4',
        caption: `╭─❮ 𝐅ᴀᴄᴇʙᴏᴏᴋ 𝐕ɪᴅᴇᴏ ❯\n│ ✦ 𝐓ɪᴛʟᴇ: ${title}\n╰────────────────────`,
      }, { quoted: msg })
    } catch (error) {
      logger.error({ jid, url, err: error.message }, 'Facebook video download failed')
      return reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ᴛʜɪs 𝐅ᴀᴄᴇʙᴏᴏᴋ ᴠɪᴅᴇᴏ. 𝐓ʀʏ ᴀɴᴏᴛʜᴇʀ ʟɪɴᴋ.')
    }
  },
}
