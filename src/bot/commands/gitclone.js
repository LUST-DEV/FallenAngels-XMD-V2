const logger = require('../../logger')

const MAX_ARCHIVE_SIZE = 100 * 1024 * 1024
const USER_AGENT = 'FallenAngels-XMD WhatsApp Bot'

function parseRepositoryUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    return null
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 'github.com' ||
    url.username ||
    url.password
  ) {
    return null
  }

  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length !== 2) return null

  const [owner, rawRepo] = parts
  const repo = rawRepo.replace(/\.git$/i, '')
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null
  return { owner, repo }
}

async function fetchArchive(owner, repo, branch) {
  let url = new URL(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/zipball/${encodeURIComponent(branch)}`
  )

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json,application/zip',
        'User-Agent': USER_AGENT,
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(90_000),
    })

    if (response.status < 300 || response.status >= 400) {
      if (!response.ok) throw new Error(`GitHub archive download failed with HTTP ${response.status}.`)
      return response
    }

    const location = response.headers.get('location')
    if (!location || redirects === 3) throw new Error('GitHub archive redirect limit exceeded.')
    const nextUrl = new URL(location, url)
    if (
      nextUrl.protocol !== 'https:' ||
      nextUrl.username ||
      nextUrl.password ||
      !['api.github.com', 'codeload.github.com'].includes(nextUrl.hostname.toLowerCase())
    ) {
      throw new Error('GitHub redirected the archive to an unsupported host.')
    }
    url = nextUrl
  }

  throw new Error('GitHub archive redirect limit exceeded.')
}

async function readArchive(response) {
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_ARCHIVE_SIZE) {
    throw new Error('Repository archive exceeds the 100 MB limit.')
  }

  const chunks = []
  let totalSize = 0
  for await (const chunk of response.body) {
    totalSize += chunk.length
    if (totalSize > MAX_ARCHIVE_SIZE) {
      await response.body.cancel()
      throw new Error('Repository archive exceeds the 100 MB limit.')
    }
    chunks.push(chunk)
  }
  if (!totalSize) throw new Error('GitHub returned an empty repository archive.')
  return Buffer.concat(chunks, totalSize)
}

module.exports = {
  name: 'gitclone',
  aliases: ['gitdl', 'github', 'git', 'repodl', 'clone'],
  desc: 'Download a public GitHub repository as a ZIP archive',
  async run({ sock, jid, msg, args, prefix, reply }) {
    const repository = parseRepositoryUrl(args[0])
    if (!repository) {
      return reply(`> ❌ 𝐔sᴀɢᴇ: ${prefix}gitclone https://github.com/<ᴏᴡɴᴇʀ>/<ʀᴇᴘᴏ>`)
    }

    const { owner, repo } = repository
    try {
      const apiUrl = new URL(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
      )
      const metadataResponse = await fetch(apiUrl, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(30_000),
      })
      if (metadataResponse.status === 404) {
        return reply('> ❌ 𝐓ʜɪs 𝐆ɪᴛHᴜʙ ʀᴇᴘᴏsɪᴛᴏʀʏ ᴡᴀs ɴᴏᴛ ғᴏᴜɴᴅ ᴏʀ ɪs ᴘʀɪᴠᴀᴛᴇ.')
      }
      if (!metadataResponse.ok) {
        throw new Error(`GitHub repository lookup failed with HTTP ${metadataResponse.status}.`)
      }

      const metadata = await metadataResponse.json()
      const branch = metadata.default_branch
      if (typeof branch !== 'string' || !branch) {
        throw new Error('GitHub did not return a default branch for this repository.')
      }

      const archive = await readArchive(await fetchArchive(owner, repo, branch))
      const filename = `${owner}-${repo}-${branch}`
        .replace(/[^\w.-]/g, '_')
        .slice(0, 170) + '.zip'
      await sock.sendMessage(jid, {
        document: archive,
        fileName: filename,
        mimetype: 'application/zip',
        caption: `╭─❮ 𓆩 𝐆ɪᴛHᴜʙ 𝐑ᴇᴘᴏsɪᴛᴏʀʏ 𓆪 ❯\n│ ✦ ${owner}/${repo}\n╰────────────────────`,
      }, { quoted: msg })
    } catch (error) {
      logger.error({ jid, owner, repo, err: error }, 'GitHub repository download failed')
      return reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ᴛʜɪs 𝐆ɪᴛHᴜʙ ʀᴇᴘᴏsɪᴛᴏʀʏ.')
    }
  },
}
