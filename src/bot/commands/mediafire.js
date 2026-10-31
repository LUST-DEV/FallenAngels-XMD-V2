const logger = require('../../logger')

const MAX_APK_SIZE = 100 * 1024 * 1024
const MAX_REDIRECTS = 5
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
const APK_MIME_TYPE = 'application/vnd.android.package-archive'

function extractUrl(text) {
  const match = String(text || '').match(/https?:\/\/[^\s<>]+/i)
  return match ? match[0].replace(/[),.!?]+$/, '') : ''
}

function isMediaFireHost(hostname) {
  const host = hostname.toLowerCase()
  return host === 'mediafire.com' || host.endsWith('.mediafire.com') ||
    host === 'mfi.re' || host.endsWith('.mfi.re')
}

function isMediaFireUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' &&
      isMediaFireHost(url.hostname) &&
      !url.username &&
      !url.password
  } catch {
    return false
  }
}

async function fetchMediaFireUrl(url, accept) {
  let currentUrl = new URL(url)

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(currentUrl, {
      headers: {
        Accept: accept,
        'User-Agent': USER_AGENT,
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(120_000),
    })
    if (response.status < 300 || response.status >= 400) {
      return { response, url: currentUrl }
    }

    const location = response.headers.get('location')
    if (!location || redirects === MAX_REDIRECTS) {
      throw new Error('MediaFire redirect limit exceeded.')
    }

    const nextUrl = new URL(location, currentUrl)
    if (
      nextUrl.protocol !== 'https:' ||
      nextUrl.username ||
      nextUrl.password ||
      !isMediaFireHost(nextUrl.hostname)
    ) {
      throw new Error('MediaFire redirected to an unsupported host.')
    }
    currentUrl = nextUrl
  }

  throw new Error('MediaFire redirect limit exceeded.')
}

function getDownloadUrl(html, pageUrl) {
  const anchors = html.match(/<a\b[^>]*>/gi) || []
  for (const anchor of anchors) {
    if (!/\bid\s*=\s*["']downloadButton["']/i.test(anchor)) continue
    const href = anchor.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]
    if (!href) break

    const downloadUrl = new URL(href.replace(/&amp;/g, '&'), pageUrl)
    if (!isMediaFireUrl(downloadUrl.href)) {
      throw new Error('MediaFire returned an unsupported download URL.')
    }
    return downloadUrl.href
  }
  throw new Error('MediaFire download button was not found.')
}

function getFilename(response, url) {
  const disposition = response.headers.get('content-disposition') || ''
  const encodedFilename = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1]
  const plainFilename = disposition.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1]
  let filename = encodedFilename
    ? decodeURIComponent(encodedFilename)
    : plainFilename

  if (!filename) {
    filename = decodeURIComponent(new URL(url).pathname.split('/').pop() || '')
  }

  return filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 180)
}

async function downloadApk(url) {
  const page = await fetchMediaFireUrl(
    url,
    'text/html,application/vnd.android.package-archive,application/octet-stream,*/*'
  )
  if (!page.response.ok) {
    throw new Error(`MediaFire page failed with HTTP ${page.response.status}.`)
  }

  const pageContentType = (page.response.headers.get('content-type') || '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  let response = page.response
  let downloadUrl = page.url
  if (pageContentType === 'text/html') {
    const html = await response.text()
    const directUrl = getDownloadUrl(html, page.url)
    const download = await fetchMediaFireUrl(
      directUrl,
      'application/vnd.android.package-archive,application/octet-stream,*/*'
    )
    response = download.response
    downloadUrl = download.url
  }
  if (!response.ok) throw new Error(`MediaFire download failed with HTTP ${response.status}.`)

  const filename = getFilename(response, downloadUrl.href) || 'download.apk'
  const contentType = (response.headers.get('content-type') || '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  const isApk = filename.toLowerCase().endsWith('.apk')
  if (!isApk && contentType !== APK_MIME_TYPE) {
    throw new Error('The MediaFire link does not point to an APK file.')
  }
  if (contentType && ![
    APK_MIME_TYPE,
    'application/octet-stream',
    'application/zip',
  ].includes(contentType)) {
    throw new Error('MediaFire returned an unsupported file type.')
  }

  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_APK_SIZE) {
    throw new Error('APK exceeds the 100 MB limit.')
  }

  const chunks = []
  let totalSize = 0
  for await (const chunk of response.body) {
    totalSize += chunk.length
    if (totalSize > MAX_APK_SIZE) {
      throw new Error('APK exceeds the 100 MB limit.')
    }
    chunks.push(chunk)
  }
  if (!totalSize) throw new Error('MediaFire returned an empty APK.')

  return {
    buffer: Buffer.concat(chunks, totalSize),
    filename: filename.toLowerCase().endsWith('.apk') ? filename : `${filename}.apk`,
  }
}

module.exports = {
  name: 'mediafire',
  aliases: ['mf'],
  desc: 'Download and send an APK from a MediaFire link',
  async run({ sock, jid, msg, args, reply }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const text = args.join(' ') || quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const url = extractUrl(text)

    if (!url || !isMediaFireUrl(url)) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .mediafire <ʟɪᴇɴ 𝐌ᴇᴅɪᴀ𝐅ɪʀᴇ ᴅ’ᴜɴ 𝐀𝐏𝐊>')
    }

    try {
      await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } })
    } catch (error) {
      logger.debug({ jid, err: error.message }, 'unable to show MediaFire download reaction')
    }

    try {
      const apk = await downloadApk(url)
      await sock.sendMessage(jid, {
        document: apk.buffer,
        mimetype: APK_MIME_TYPE,
        fileName: apk.filename,
        caption: '╭─❮ 𓆩 𝐌ᴇᴅɪᴀ𝐅ɪʀᴇ 𝐀𝐏𝐊 𓆪 ❯\n│ ✦ 𝐅ɪʟᴇ: ' +
          `${apk.filename}\n╰────────────────────`,
      }, { quoted: msg })
    } catch (error) {
      logger.error({ jid, url, err: error }, 'MediaFire APK download failed')
      const details = String(error.message || 'Unknown error')
        .replace(/https?:\/\/\S+/gi, '[URL]')
        .slice(0, 180)
      return reply(`> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ᴛʜɪs 𝐀𝐏𝐊.\n𝐃ᴇᴛᴀɪʟs: ${details}`)
    }
  },
}
