const crypto = require('node:crypto')
const { spawn } = require('node:child_process')
const { isIP } = require('node:net')
const ffmpegPath = require('ffmpeg-static')
const ytdl = require('@distube/ytdl-core')
const yts = require('yt-search')
const {
  generateWAMessageFromContent,
  normalizeMessageContent,
  prepareWAMessageMedia,
  proto,
} = require('@whiskeysockets/baileys')
const logger = require('../logger')

const MAX_AUDIO_SIZE = 50 * 1024 * 1024
const MEDIA_TIMEOUT_MS = 60_000
const MAX_CONVERTED_AUDIO_SIZE = 50 * 1024 * 1024
const BUTTON_TIMEOUT_MS = 5 * 60 * 1000
const USER_AGENT = 'FallenAngels-XMD WhatsApp Bot'

function parseYouTubeUrl(value) {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return null

    const hostname = url.hostname.toLowerCase()
    if (hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null
    if (hostname !== 'youtube.com' && !hostname.endsWith('.youtube.com')) return null
    if (url.pathname === '/watch') return url.searchParams.get('v')
    const videoPath = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)
    return videoPath?.[1] || null
  } catch {
    return null
  }
}

function formatViews(views) {
  const count = typeof views === 'number' ? views : Number(String(views || '').replace(/[^\d]/g, ''))
  return Number.isFinite(count) && count > 0 ? new Intl.NumberFormat('en-US').format(count) : 'Unknown'
}

function formatDuration(video) {
  return video.duration?.timestamp || video.timestamp || video.duration?.toString?.() || 'Unknown'
}

function safeMediaUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('Audio service returned an invalid download URL.')
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    isIP(hostname) ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Audio service returned an unsupported download URL.')
  }

  return url
}

async function fetchAudioBuffer(url) {
  let currentUrl = safeMediaUrl(url)
  let response
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    response = await fetch(currentUrl, {
      headers: {
        Accept: 'audio/mpeg,audio/*,application/octet-stream,*/*',
        'User-Agent': USER_AGENT,
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS),
    })
    if (response.status < 300 || response.status >= 400) break

    const location = response.headers.get('location')
    if (!location || redirects === 5) throw new Error('Audio download redirect limit exceeded.')
    await response.body?.cancel()
    currentUrl = safeMediaUrl(new URL(location, currentUrl).href)
  }

  if (!response.ok) throw new Error(`Audio download failed with HTTP ${response.status}.`)

  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_SIZE) {
    throw new Error('Audio file exceeds the 50 MB limit.')
  }

  const chunks = []
  let totalSize = 0
  for await (const chunk of response.body) {
    totalSize += chunk.length
    if (totalSize > MAX_AUDIO_SIZE) {
      await response.body.cancel()
      throw new Error('Audio file exceeds the 50 MB limit.')
    }
    chunks.push(chunk)
  }
  if (totalSize === 0) throw new Error('Audio download was empty.')
  return Buffer.concat(chunks, totalSize)
}

async function downloadWithYtdl(videoUrl) {
  const stream = ytdl(videoUrl, {
    filter: 'audioonly',
    quality: 'highestaudio',
    requestOptions: {
      headers: { 'User-Agent': USER_AGENT },
    },
  })
  let format
  stream.once('info', (_info, selectedFormat) => {
    format = selectedFormat
  })

  const timeout = setTimeout(() => {
    stream.destroy(new Error('Direct YouTube audio download timed out.'))
  }, MEDIA_TIMEOUT_MS)
  timeout.unref?.()

  const chunks = []
  let totalSize = 0
  try {
    for await (const chunk of stream) {
      totalSize += chunk.length
      if (totalSize > MAX_AUDIO_SIZE) {
        stream.destroy(new Error('Audio file exceeds the 50 MB limit.'))
        throw new Error('Audio file exceeds the 50 MB limit.')
      }
      chunks.push(chunk)
    }
  } finally {
    clearTimeout(timeout)
  }

  if (!totalSize) throw new Error('Direct YouTube audio download was empty.')
  const mimetype = String(format?.mimeType || '').split(';')[0]
  if (!mimetype.startsWith('audio/')) throw new Error('YouTube did not provide an audio-only format.')

  const container = String(format?.container || '').toLowerCase()
  const extension = ['mp4', 'm4a', 'webm', 'ogg', 'mp3', 'aac'].includes(container)
    ? container
    : 'webm'
  return {
    buffer: Buffer.concat(chunks, totalSize),
    mimetype,
    extension,
  }
}

function convertToMp3(input) {
  if (!ffmpegPath) throw new Error('FFmpeg is not available on this system.')

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-vn',
      '-ac', '2',
      '-codec:a', 'libmp3lame',
      '-b:a', '192k',
      '-f', 'mp3',
      'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'pipe'] })

    const chunks = []
    const errors = []
    let outputBytes = 0
    let settled = false

    const timeout = setTimeout(() => {
      ffmpeg.kill()
      if (!settled) {
        settled = true
        reject(new Error('Audio conversion timed out after 60 seconds.'))
      }
    }, MEDIA_TIMEOUT_MS)

    const fail = (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      ffmpeg.kill()
      reject(error)
    }

    ffmpeg.stdout.on('data', (chunk) => {
      outputBytes += chunk.length
      if (outputBytes > MAX_CONVERTED_AUDIO_SIZE) {
        fail(new Error('Converted audio exceeds the 50 MB limit.'))
        return
      }
      chunks.push(chunk)
    })
    ffmpeg.stderr.on('data', (chunk) => errors.push(chunk))
    ffmpeg.on('error', fail)
    ffmpeg.on('close', (code) => {
      clearTimeout(timeout)
      if (settled) return
      settled = true
      if (code !== 0) {
        reject(new Error(`Audio conversion failed: ${Buffer.concat(errors).toString('utf8').trim()}`))
      } else if (chunks.length === 0) {
        reject(new Error('Audio conversion produced an empty file.'))
      } else {
        resolve(Buffer.concat(chunks, outputBytes))
      }
    })
    ffmpeg.stdin.on('error', (error) => {
      if (error.code !== 'EPIPE') fail(error)
    })
    ffmpeg.stdin.end(input)
  })
}

async function ensureMp3(audio) {
  if (audio.mimetype === 'audio/mpeg' && audio.extension === 'mp3') return audio
  return {
    buffer: await convertToMp3(audio.buffer),
    mimetype: 'audio/mpeg',
    extension: 'mp3',
  }
}

async function downloadFromSources(videoUrl) {
  const sources = [
    {
      name: 'Keith',
      getUrl: async () => {
        const endpoint = new URL('https://apis-keith.vercel.app/download/dlmp3')
        endpoint.searchParams.set('url', videoUrl)
        const response = await fetch(endpoint, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(30_000),
        })
        if (!response.ok) throw new Error(`Audio API failed with HTTP ${response.status}.`)
        const data = await response.json()
        if (data?.status !== true || typeof data.result?.downloadUrl !== 'string') {
          throw new Error('Audio API returned no download URL.')
        }
        return data.result.downloadUrl
      },
    },
    {
      name: 'Cobalt',
      getUrl: async () => {
        const response = await fetch('https://cobalt.api.scip.dev/', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl, downloadMode: 'audio', audioFormat: 'mp3' }),
          signal: AbortSignal.timeout(30_000),
        })
        if (!response.ok) throw new Error(`Cobalt failed with HTTP ${response.status}.`)
        const data = await response.json()
        if (typeof data?.url !== 'string') throw new Error('Cobalt returned no audio URL.')
        return data.url
      },
    },
    {
      name: 'Vreden',
      getUrl: async () => {
        const endpoint = new URL('https://api.vreden.my.id/api/ytmp3')
        endpoint.searchParams.set('url', videoUrl)
        const response = await fetch(endpoint, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(30_000),
        })
        if (!response.ok) throw new Error(`Vreden failed with HTTP ${response.status}.`)
        const data = await response.json()
        const url = data?.result?.download?.url || data?.result?.url
        if (typeof url !== 'string') throw new Error('Vreden returned no audio URL.')
        return url
      },
    },
    {
      name: 'Dreaded',
      getUrl: async () => {
        const endpoint = new URL('https://api.dreaded.site/api/ytdl/video')
        endpoint.searchParams.set('url', videoUrl)
        const response = await fetch(endpoint, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(30_000),
        })
        if (!response.ok) throw new Error(`Dreaded failed with HTTP ${response.status}.`)
        const data = await response.json()
        const url = data?.result?.downloadUrl || data?.result?.audio
        if (typeof url !== 'string') throw new Error('Dreaded returned no audio URL.')
        return url
      },
    },
  ]

  const failures = []
  for (const source of sources) {
    try {
      const audioUrl = await source.getUrl()
      return await ensureMp3({
        buffer: await fetchAudioBuffer(audioUrl),
        mimetype: 'audio/mpeg',
        extension: 'mp3',
      })
    } catch (error) {
      failures.push(`${source.name}: ${error.message}`)
      logger.debug({ source: source.name, err: error.message }, 'YouTube audio source failed')
    }
  }

  try {
    return await ensureMp3(await downloadWithYtdl(videoUrl))
  } catch (error) {
    failures.push(`Direct YouTube: ${error.message}`)
    logger.debug({ source: 'Direct YouTube', err: error.message }, 'YouTube audio source failed')
  }

  throw new Error(`All YouTube audio sources failed. ${failures.join(' ')}`)
}

function extractButtonId(message) {
  const content = normalizeMessageContent(message || {})
  const directId = content.templateButtonReplyMessage?.selectedId ||
    content.buttonsResponseMessage?.selectedButtonId ||
    content.listResponseMessage?.singleSelectReply?.selectedRowId
  if (directId) return directId

  const nativeFlow = content.interactiveResponseMessage?.nativeFlowResponseMessage
  if (nativeFlow?.paramsJson) {
    try {
      const params = JSON.parse(nativeFlow.paramsJson)
      return params.id || params.selectedId || params.selectedRowId || null
    } catch (error) {
      logger.warn({ err: error.message }, 'unable to parse YouTube audio button response')
    }
  }

  return content.interactiveResponseMessage?.buttonId || null
}

function safeFileName(title, extension = 'mp3') {
  const name = String(title || 'audio')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .trim()
    .slice(0, 120)
  return `${name || 'audio'}.${extension}`
}

async function runYouTubeAudio({ sock, jid, msg, args, reply, prefix }) {
  const query = args.join(' ').trim()
  if (!query) {
    return reply(`> ❌ 𝐔sᴀɢᴇ: ${prefix}play <sᴏɴɢ ɴᴀᴍᴇ ᴏʀ 𝐘ᴏᴜTᴜʙᴇ ʟɪɴᴋ>`)
  }

  let video
  try {
    const videoId = parseYouTubeUrl(query)
    const search = videoId ? await yts({ videoId }) : await yts(query)
    video = search?.videos?.[0] || search
    if (!video?.url || !video?.title) {
      return reply('> ❌ 𝐍ᴏ 𝐘ᴏᴜTᴜʙᴇ ᴛʀᴀᴄᴋ ғᴏᴜɴᴅ ғᴏʀ ᴛʜᴀᴛ ǫᴜᴇʀʏ.')
    }
  } catch (error) {
    logger.error({ jid, query, err: error.message }, 'YouTube audio search failed')
    return reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ sᴇᴀʀᴄʜ 𝐘ᴏᴜTᴜʙᴇ. 𝐏ʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ.')
  }

  const title = String(video.title).slice(0, 180)
  const artist = String(video.author?.name || video.channel?.name || video.channel || 'Unknown artist').slice(0, 120)
  const videoUrl = video.url
  const thumbnail = video.thumbnail || video.image
  if (!thumbnail) {
    return reply('> ❌ 𝐓ʜɪs 𝐘ᴏᴜTᴜʙᴇ ᴛʀᴀᴄᴋ ʜᴀs ɴᴏ ᴘʀᴇᴠɪᴇᴡ ɪᴍᴀɢᴇ.')
  }

  const buttonId = `download_audio_${crypto.randomUUID()}`
  let timeout
  let responseHandled = false
  const cleanup = () => {
    if (timeout) clearTimeout(timeout)
    sock.ev.off('messages.upsert', handleResponse)
  }

  const handleResponse = async (event = {}) => {
    const messages = Array.isArray(event.messages) ? event.messages : []
    const responseMessage = messages.find((candidate) =>
      candidate.key?.remoteJid === jid &&
      extractButtonId(candidate.message) === buttonId,
    )
    if (!responseMessage || responseHandled) return
    responseHandled = true
    cleanup()

    try {
      await sock.sendMessage(jid, { react: { text: '⬇️', key: responseMessage.key } })
      const { buffer, mimetype, extension } = await downloadFromSources(videoUrl)
      await sock.sendMessage(jid, {
        audio: buffer,
        mimetype,
        fileName: safeFileName(title, extension),
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title,
            body: artist,
            mediaType: 1,
            sourceUrl: videoUrl,
            thumbnailUrl: thumbnail,
          },
        },
      }, { quoted: responseMessage })
      await sock.sendMessage(jid, { react: { text: '✅', key: responseMessage.key } })
    } catch (error) {
      logger.error({ jid, videoUrl, err: error.message }, 'YouTube audio download failed after selection')
      try {
        await sock.sendMessage(jid, { react: { text: '❌', key: responseMessage.key } })
      } catch (reactionError) {
        logger.debug({ jid, err: reactionError.message }, 'unable to react to YouTube audio download failure')
      }
      await reply(`> ❌ 𝐃ᴏᴡɴʟᴏᴀᴅ ғᴀɪʟᴇᴅ: ${error.message.slice(0, 180)}`)
    }
  }

  if (!sock.ev || typeof sock.ev.on !== 'function' || typeof sock.ev.off !== 'function') {
    throw new Error('WhatsApp socket does not support message event listeners.')
  }
  sock.ev.on('messages.upsert', handleResponse)
  timeout = setTimeout(cleanup, BUTTON_TIMEOUT_MS)
  timeout.unref?.()

  try {
    const media = await prepareWAMessageMedia(
      { image: { url: thumbnail } },
      {
        upload: sock.waUploadToServer,
        logger: sock.logger,
        userJid: sock.user?.id,
      },
    )
    const text = [
      `╭─❮ 𓆩 𝐌ᴜsɪᴄ 𝐃ᴏᴡɴʟᴏᴀᴅᴇʀ 𓆪 ❯`,
      `│ ✦ 𝐓ɪᴛʟᴇ: ${title}`,
      `│ ♬ 𝐀ʀᴛɪsᴛ: ${artist}`,
      `│ 👁 𝐕ɪᴇᴡs: ${formatViews(video.views)}`,
      `│ ⏱ 𝐃ᴜʀᴀᴛɪᴏɴ: ${formatDuration(video)}`,
      '│',
      '│ 📥 𝐏ʀᴇss 𝐃ᴏᴡɴʟᴏᴀᴅ ᴛᴏ ɢᴇᴛ ᴛʜᴇ ᴀᴜᴅɪᴏ',
      '╰─────────────────────────',
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
            footer: proto.Message.InteractiveMessage.Footer.create({
              text: '𝐌ᴀᴅᴇ ʙʏ 𝐒ᴇɴɪᴏʀ 𝐀ɴɢᴇʟs',
            }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
              buttons: [{
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: '🗃 𝐃ᴏᴡɴʟᴏᴀᴅ',
                  id: buttonId,
                }),
              }],
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
    if (!jid.endsWith('@g.us')) additionalNodes.push({ tag: 'bot', attrs: { biz_bot: '1' } })
    await sock.relayMessage(jid, generated.message, {
      messageId: generated.key.id,
      additionalNodes,
    })
    try {
      await sock.sendMessage(jid, { react: { text: '🎶', key: msg.key } })
    } catch (error) {
      logger.debug({ jid, err: error.message }, 'unable to react to YouTube audio preview')
    }
  } catch (error) {
    cleanup()
    logger.error({ jid, query, err: error }, 'YouTube audio metadata card could not be sent')
    return reply('> ❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ sᴇɴᴅ ᴛʜᴇ 𝐘ᴏᴜTᴜʙᴇ ᴛʀᴀᴄᴋ ᴘʀᴇᴠɪᴇᴡ.')
  }
}

module.exports = { runYouTubeAudio, convertToMp3 }
