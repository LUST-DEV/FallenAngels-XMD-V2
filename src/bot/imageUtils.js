async function downloadImage(url, maxBytes = 10 * 1024 * 1024) {
  const imageUrl = new URL(url)
  if (imageUrl.protocol !== 'https:' || imageUrl.username || imageUrl.password) {
    throw new Error('Image URL must use HTTPS and cannot include credentials.')
  }

  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`Image download failed with HTTP ${response.status}.`)

  const declaredLength = Number(response.headers.get('content-length') || 0)
  if (declaredLength > maxBytes) throw new Error('Image exceeds the 10 MB limit.')

  const chunks = []
  let totalBytes = 0
  for await (const chunk of response.body) {
    totalBytes += chunk.length
    if (totalBytes > maxBytes) {
      await response.body.cancel()
      throw new Error('Image exceeds the 10 MB limit.')
    }
    chunks.push(chunk)
  }
  if (totalBytes === 0) throw new Error('Image download was empty.')
  return Buffer.concat(chunks, totalBytes)
}

module.exports = { downloadImage }
