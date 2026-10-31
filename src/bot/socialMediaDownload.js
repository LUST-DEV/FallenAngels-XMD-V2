const MAX_MEDIA_SIZE = 100 * 1024 * 1024
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

const PLATFORMS = {
  pinterest: {
    label: 'Pinterest',
    api: 'https://api.hanggts.xyz/download/pinterest',
    fallbackApi: 'https://api.vreden.my.id/api/pinterest',
    mediaHost: (hostname) => hostname === 'pinimg.com' || hostname.endsWith('.pinimg.com'),
  },
  twitter: {
    label: 'X / Twitter',
    api: 'https://api.hanggts.xyz/download/twitter',
    fallbackApi: 'https://api.vreden.my.id/api/twitter',
    mediaHost: (hostname) => hostname === 'twimg.com' || hostname.endsWith('.twimg.com'),
  },
}

function extractUrl(text) {
  const match = String(text || '').match(/https?:\/\/[^\s<>]+/i)
  return match ? match[0].replace(/[),.!?]+$/, '') : ''
}

function isValidPostUrl(platform, value) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    const validHost = platform === 'pinterest'
      ? hostname === 'pinterest.com' || hostname.endsWith('.pinterest.com') || hostname === 'pin.it'
      : hostname === 'twitter.com' || hostname.endsWith('.twitter.com') ||
        hostname === 'x.com' || hostname.endsWith('.x.com') || hostname === 't.co'
    return ['https:', 'http:'].includes(url.protocol) && validHost && !url.username && !url.password
  } catch {
    return false
  }
}

function findMediaCandidates(payload) {
  const candidates = []
  const visited = new Set()

  function visit(value, depth = 0) {
    if (!value || depth > 5) return
    if (typeof value === 'string') {
      if (/^https?:\/\//i.test(value) && !visited.has(value)) {
        visited.add(value)
        candidates.push({ url: value })
      }
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1)
      return
    }
    if (typeof value !== 'object') return

    const preferredKeys = [
      'video_hd', 'video', 'video_sd', 'videoUrl', 'video_url',
      'downloadUrl', 'download_url', 'download', 'url', 'src', 'image',
      'imageUrl', 'image_url', 'mediaUrl', 'media_url',
    ]
    for (const key of preferredKeys) {
      if (key in value) visit(value[key], depth + 1)
    }
    if (Array.isArray(value.media)) visit(value.media, depth + 1)
    if (Array.isArray(value.images)) visit(value.images, depth + 1)
    if (Array.isArray(value.urls)) visit(value.urls, depth + 1)
    if (Array.isArray(value.downloads)) visit(value.downloads, depth + 1)
    for (const key of ['result', 'data', 'media', 'images', 'urls', 'downloads', 'items']) {
      if (key in value) visit(value[key], depth + 1)
    }
  }

  visit(payload)
  return candidates
}

function getTitle(payload, fallback) {
  const result = payload?.result
  const title = result?.info?.title || result?.title || payload?.title ||
    payload?.data?.title || payload?.data?.description
  return typeof title === 'string' && title.trim() ? title.trim().slice(0, 180) : fallback
}

async function getMediaInfo(platform, postUrl) {
  const settings = PLATFORMS[platform]
  const endpoints = [settings.api, settings.fallbackApi]
  let lastError

  for (const endpointUrl of endpoints) {
    try {
      const endpoint = new URL(endpointUrl)
      endpoint.searchParams.set('url', postUrl)
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new Error(`Downloader returned HTTP ${response.status}.`)
      const payload = await response.json()
      const candidates = findMediaCandidates(payload).filter(({ url }) => {
        try {
          const mediaUrl = new URL(url)
          return mediaUrl.protocol === 'https:' &&
            !mediaUrl.username &&
            !mediaUrl.password &&
            settings.mediaHost(mediaUrl.hostname.toLowerCase())
        } catch {
          return false
        }
      })
      if (!candidates.length) throw new Error('Downloader response contained no supported media URL.')
      return { candidates: candidates.slice(0, 4), title: getTitle(payload, settings.label) }
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(`All ${settings.label} download services failed.`, { cause: lastError })
}

async function fetchMediaResponse(platform, url) {
  const settings = PLATFORMS[platform]
  let currentUrl = new URL(url)

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(currentUrl, {
      headers: { Accept: 'video/*,image/*,application/octet-stream', 'User-Agent': USER_AGENT },
      redirect: 'manual',
      signal: AbortSignal.timeout(90_000),
    })
    if (response.status < 300 || response.status >= 400) return { response, url: currentUrl }

    const location = response.headers.get('location')
    if (!location || redirects === 3) throw new Error(`${settings.label} media redirect limit exceeded.`)
    const nextUrl = new URL(location, currentUrl)
    if (
      nextUrl.protocol !== 'https:' ||
      nextUrl.username ||
      nextUrl.password ||
      !settings.mediaHost(nextUrl.hostname.toLowerCase())
    ) {
      throw new Error(`${settings.label} media redirected to an unsupported host.`)
    }
    currentUrl = nextUrl
  }

  throw new Error(`${settings.label} media redirect limit exceeded.`)
}

async function downloadMediaBuffer(platform, url) {
  const settings = PLATFORMS[platform]
  const { response, url: mediaUrl } = await fetchMediaResponse(platform, url)
  if (!response.ok) throw new Error(`${platform} media download returned HTTP ${response.status}.`)

  let contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (contentType === 'application/octet-stream' || contentType === '') {
    const extension = mediaUrl.pathname.split('.').pop()?.toLowerCase()
    const inferredTypes = {
      gif: 'image/gif',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      mp4: 'video/mp4',
      png: 'image/png',
      webp: 'image/webp',
    }
    contentType = inferredTypes[extension] || contentType
  }
  if (!contentType.startsWith('video/') && !contentType.startsWith('image/')) {
    throw new Error(`${platform} media URL did not return an image or video.`)
  }

  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_MEDIA_SIZE) {
    throw new Error(`${platform} media exceeded the 100 MB limit.`)
  }

  const chunks = []
  let totalSize = 0
  for await (const chunk of response.body) {
    totalSize += chunk.length
    if (totalSize > MAX_MEDIA_SIZE) {
      await response.body.cancel()
      throw new Error(`${platform} media exceeded the 100 MB limit.`)
    }
    chunks.push(chunk)
  }
  if (totalSize === 0) throw new Error(`${platform} media download was empty.`)
  return { buffer: Buffer.concat(chunks, totalSize), mimetype: contentType }
}

async function downloadSocialMedia(platform, postUrl) {
  const { candidates, title } = await getMediaInfo(platform, postUrl)
  const files = []
  for (const candidate of candidates) {
    files.push(await downloadMediaBuffer(platform, candidate.url))
  }
  return { files, title, label: PLATFORMS[platform].label }
}

module.exports = { downloadSocialMedia, extractUrl, isValidPostUrl }
