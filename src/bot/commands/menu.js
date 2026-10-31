const fs = require('node:fs')
const path = require('node:path')
const {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} = require('@whiskeysockets/baileys')
const config = require('../../config')
const logger = require('../../logger')
const { User } = require('../../database')

const groupCommands = new Set([
  'accept', 'acceptall', 'add', 'admins', 'antilink', 'autoaccept', 'close',
  'demote', 'event', 'goodbye', 'groupinfo', 'groupstats', 'grouplink', 'hidetag', 'kick', 'kickall', 'open',
  'poll', 'promote', 'reject', 'rejectall', 'resetwarn', 'rules', 'setdesc',
  'setgoodbye', 'setname', 'setrules', 'setwelcome', 'slowmode', 'tagadmin',
  'tagall', 'topchat', 'warn', 'warnings', 'welcome',
])

const funCommands = new Set(['8ball', 'animequote', 'fact', 'joke', 'profile', 'quote', 'ship', 'shipping'])
const ownerMenuCommands = new Set(['leave', 'slowmode'])
const downloadCommands = new Set([
  'audio', 'facebook', 'gitclone', 'mediafire', 'pinterest', 'play', 'song', 'tiktok', 'twitter',
])
const mediaCommands = new Set([
  '8d', 'brightness', 'caption', 'contrast', 'grayscale', 'imagine', 'mirror', 'nightcore',
  'invert', 'pixelate', 'removebg', 'reverse', 'saturate', 'sepia', 'sharpen', 'sign',
  'slowed', 'speedup', 'togif', 'vintage', 'wallpaper',
])
const toolsCommands = new Set([
  'age', 'base64', 'case', 'choose', 'color', 'convert', 'count', 'currency',
  'decode', 'define', 'encode', 'flip', 'moon', 'note', 'palindrome', 'password',
  'percent', 'random', 'remind', 'time', 'timezone', 'timestamp', 'todo', 'uuid',
])
const otherCommands = new Set([
  'about', 'afk', 'alive', 'anime', 'bin', 'button', 'calc', 'checkmail', 'country', 'crypto', 'devinfo',
  'cross', 'dns', 'getpp', 'gituser', 'id', 'lyrics', 'npm', 'ping', 'qr', 'runtime',
  'shorten', 'stickers', 'techfact', 'tempmail', 'translate', 'uptime',
  'weather', 'wiki', 'toimg', 'tovideo',
])
const smallCapsLetters = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ',
  i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ',
  q: 'ꞯ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x',
  y: 'ʏ', z: 'ᴢ',
}
const menuCategories = {
  all: { title: '𝐀ʟʟ' },
  group: { title: '𝐆ʀᴏᴜᴘ', commandNames: groupCommands },
  owner: { title: '𝐎ᴡɴᴇʀ', commandNames: ownerMenuCommands, ownerOnly: true },
  ai: { title: '𝐀ɪ', commandNames: new Set(['ai', 'claude', 'gemini', 'groq', 'mistral']) },
  tools: { title: '𝐓ᴏᴏʟs', commandNames: toolsCommands },
  fun: { title: '𝐅ᴜɴ', commandNames: funCommands },
  downloader: { title: '𝐃ᴏᴡɴʟᴏᴀᴅᴇʀ', commandNames: downloadCommands },
  media: { title: '𝐌ᴇᴅɪᴀ', commandNames: mediaCommands },
  others: { title: '𝐎ᴛʜᴇʀs' },
}

function uniqueCommands(commands) {
  return [...new Set(commands.values())]
}

function toSmallCaps(text) {
  let result = '';

  for (const character of text.toLowerCase()) {
    result += smallCapsLetters[character] || character;
  }

  return `*${result}*`;
}


function getCategoryCommands(categoryKey, commands, isOwner) {
  const allCommands = uniqueCommands(commands)
  const category = menuCategories[categoryKey]
  let entries

  if (categoryKey === 'all') {
    entries = allCommands
  } else if (categoryKey === 'others') {
    const categorizedNames = new Set([
      ...groupCommands,
      ...funCommands,
      ...ownerMenuCommands,
      ...downloadCommands,
      ...mediaCommands,
      ...toolsCommands,
      'ai',
      'menu',
    ])
    entries = allCommands.filter((command) => (
      !command.ownerOnly &&
      (otherCommands.has(command.name) || !categorizedNames.has(command.name))
    ))
  } else if (categoryKey === 'owner') {
    entries = allCommands.filter((command) => command.ownerOnly || category.commandNames.has(command.name))
  } else {
    entries = allCommands.filter((command) => category.commandNames.has(command.name))
  }

  return entries
    .filter((command) => isOwner || !command.ownerOnly)
    .sort((left, right) => left.name.localeCompare(right.name))
}

function formatMenuUptime() {
  const totalSeconds = Math.floor(process.uptime())
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const parts = []

  if (days) parts.push(`${days}d`)
  if (hours || days) parts.push(`${hours}h`)
  parts.push(`${minutes}m`)
  return parts.join(', ')
}

async function menuText({ categoryKey, commands, prefix, msg, numero, isOwner }) {
  const user = await User.findByPk(numero, { attributes: ['botMode'] })
  const commandCount = uniqueCommands(commands).filter((command) => isOwner || !command.ownerOnly).length
  const lines = [
    '╭─❮ 𝐅ᴀʟʟᴇɴ X 𝐀ɴɢᴇʟs ❯',
    '│ 𝐎ᴡɴᴇʀ: 𝐒ᴇɴɪᴏʀ\'s 𝐀ɴɢᴇʟs',
    `│ 𝐏ʀᴇғɪx: [ ${prefix} ]`,
    `│ 𝐌ᴏᴅᴇ: ${user?.botMode === 'private' ? '𝐏ʀɪᴠᴀᴛᴇ' : '𝐏ᴜʙʟɪᴄ'}`,
    `│ 𝐔ᴘᴛɪᴍᴇ: ${formatMenuUptime()}`,
    `│ 𝐂ᴏᴍᴍᴀɴᴅs: ${commandCount}`,
    `│ 𝐔sᴇʀ: ${msg.pushName || '𝐔ɴᴋɴᴏᴡɴ'}`,
    '╰─────────────────────────',
  ]

  if (!categoryKey) {
    const availableMenus = getMenuRows(prefix, isOwner)
      .map((menu) => `│ ${prefix}${toSmallCaps(menu.id.slice(prefix.length))}`)
    lines.push(
      '',
      '╭─❮ 𝐀ᴠᴀɪʟᴀʙʟᴇ 𝐌ᴇɴᴜs ❯',
      ...availableMenus,
      '╰─────────────────────────',
    )
  }

  if (categoryKey) {
    const category = menuCategories[categoryKey]
    const entries = getCategoryCommands(categoryKey, commands, isOwner)
    lines.push(
      '',
      `╭─❮ ${category.title} 𝐂ᴏᴍᴍᴀɴᴅs ❯`,
      ...entries.map((command) => `│ ${prefix}${toSmallCaps(command.name)}`),
      '╰─────────────────────────',
    )
  }

  return lines.join('\n')
}

async function getRandomMenuImage() {
  const files = await fs.promises.readdir(config.menuImagesDir, { withFileTypes: true })
  const images = files
    .filter((file) => file.isFile() && /\.(?:jpe?g|png|webp)$/i.test(file.name))
    .map((file) => file.name)

  if (images.length === 0) {
    throw new Error(`No menu images found in ${config.menuImagesDir}`)
  }

  const imageName = images[Math.floor(Math.random() * images.length)]
  return fs.promises.readFile(path.join(config.menuImagesDir, imageName))
}

function getMenuRows(prefix, isOwner) {
  const rows = [
    {
      header: '𝐀ʟʟ',
      title: '🗂 𝐀ʟʟ 𝐂ᴏᴍᴍᴀɴᴅs',
      description: '𝐃ɪsᴘʟᴀʏ ᴛʜᴇ ᴄᴏᴍᴘʟᴇᴛᴇ ᴄᴏᴍᴍᴀɴᴅ ᴍᴇɴᴜ',
      id: `${prefix}allmenu`,
    },
    {
      header: '𝐆ʀᴏᴜᴘ',
      title: '👥 𝐆ʀᴏᴜᴘ 𝐌ᴏᴅᴇʀᴀᴛɪᴏɴ',
      description: '𝐆ʀᴏᴜᴘ ᴀᴅᴍɪɴɪsᴛʀᴀᴛɪᴏɴ ᴀɴᴅ ᴍᴏᴅᴇʀᴀᴛɪᴏɴ',
      id: `${prefix}group`,
    },
    {
      header: '𝐀ɪ',
      title: '🜏 𝐀ɪ 𝐀ssɪsᴛᴀɴᴛ',
      description: '𝐀ɪ ᴀssɪsᴛᴀɴᴛ ᴄᴏᴍᴍᴀɴᴅs',
      id: `${prefix}aimenu`,
    },
    {
      header: '𝐓ᴏᴏʟs',
      title: '⚙️ 𝐓ᴏᴏʟs & 𝐔ᴛɪʟɪᴛɪᴇs',
      description: '𝐓ᴇxᴛ, ᴄᴏɴᴠᴇʀsɪᴏɴ, ʀᴇᴍɪɴᴅᴇʀs ᴀɴᴅ ɴᴏᴛᴇs',
      id: `${prefix}tools`,
    },
    {
      header: '𝐅ᴜɴ',
      title: '🎲 𝐅ᴜɴ ᴀɴᴅ 𝐆ᴀᴍᴇs',
      description: '𝐆ᴀᴍᴇs ᴀɴᴅ ᴇɴᴛᴇʀᴛᴀɪɴᴍᴇɴᴛ',
      id: `${prefix}fun`,
    },
    {
      header: '𝐌ᴇᴅɪᴀ',
      title: '📹 𝐌ᴇᴅɪᴀ 𝐓ᴏᴏʟs',
      description: '𝐀ᴜᴅɪᴏ, ɪᴍᴀɢᴇ ᴀɴᴅ ᴠɪᴅᴇᴏ ᴄᴏᴍᴍᴀɴᴅs',
      id: `${prefix}mediamenu`,
    },
    {
      header: '𝐃ᴏᴡɴʟᴏᴀᴅᴇʀ',
      title: '⬇️ 𝐃ᴏᴡɴʟᴏᴀᴅ 𝐂ᴏᴍᴍᴀɴᴅs',
      description: '𝐕ɪᴅᴇᴏ, ᴀᴜᴅɪᴏ ᴀɴᴅ ᴍᴇᴅɪᴀ ᴅᴏᴡɴʟᴏᴀᴅs',
      id: `${prefix}downloader`,
    },
    {
      header: '𝐎ᴛʜᴇʀs',
      title: '🧩 𝐎ᴛʜᴇʀ 𝐂ᴏᴍᴍᴀɴᴅs',
      description: '𝐔ᴛɪʟɪᴛɪᴇs ᴀɴᴅ ᴏᴛʜᴇʀ ᴄᴏᴍᴍᴀɴᴅs',
      id: `${prefix}others`,
    },
  ]

  if (isOwner) {
    rows.splice(2, 0, {
      header: '𝐎ᴡɴᴇʀ',
      title: '♛ 𝐎ᴡɴᴇʀ 𝐂ᴏᴍᴍᴀɴᴅs',
      description: '𝐎ᴡɴᴇʀ-ᴏɴʟʏ ᴄᴏᴍᴍᴀɴᴅs',
      id: `${prefix}owner`,
    })
  }

  return rows
}

async function sendVideoNoteBeforeMenu(sock, jid, msg) {
  const videoPath = path.join(config.assetsDir, 'angelsgif.mp4')
  if (!fs.existsSync(videoPath)) {
    logger.warn({ jid, videoPath }, 'menu intro video not found')
    return
  }

  await sock.sendMessage(jid, {
    video: fs.readFileSync(videoPath),
    mimetype: 'video/mp4',
    ptv: true,
  }, { quoted: msg })

  await new Promise((resolve) => setTimeout(resolve, 800))
}

async function sendMenu(sock, jid, msg, prefix, text, isOwner) {
  const image = await getRandomMenuImage()
  const safeLogger = sock.logger && typeof sock.logger.debug === 'function'
    ? sock.logger
    : { debug() {}, info() {}, warn() {}, error() {}, trace() {} }

  try {
    const media = await prepareWAMessageMedia(
      { image },
      {
        upload: sock.waUploadToServer,
        logger: safeLogger,
        userJid: sock.user?.id,
      }
    )
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
              text: [
                '╭─❮ 𝐓ʜᴇ 𝐃ᴀʀᴋ 𝐂ᴜʀsᴇ ❯',
                '│ 𝐌ᴀᴅᴇ ʙʏ 𝐒ᴇɴɪᴏʀ 𝐀ɴɢᴇʟs',
                '╰─────────────────────────',
              ].join('\n'),
            }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
              buttons: [
                {
                  name: 'single_select',
                  buttonParamsJson: JSON.stringify({
                    title: '📁 𝐒ᴇʟᴇᴄᴛ 𝐂ᴀᴛᴇɢᴏʀʏ',
                    sections: [{
                      title: '📁 𝐂ᴀᴛᴇɢᴏʀɪᴇs',
                      rows: getMenuRows(prefix, isOwner),
                    }],
                  }),
                },
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: '💻 𝐃ᴇᴠ 𝐈ɴғᴏ',
                    url: config.developerContact,
                  }),
                },
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: '📡 𝐂ʜᴀɴɴᴇʟ',
                    url: 'https://whatsapp.com/channel/0029VbDvjLfE50UqjuQXVJ1m',
                  }),
                },
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: '💬 𝐒ᴜᴘᴘᴏʀᴛ',
                    url: 'https://chat.whatsapp.com/EgCDIXTPbyDDKUpuSSvP5Z',
                  }),
                },
              ],
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
    if (!jid.endsWith('@g.us')) {
      additionalNodes.push({ tag: 'bot', attrs: { biz_bot: '1' } })
    }

    await sock.relayMessage(jid, generated.message, {
      messageId: generated.key.id,
      additionalNodes,
    })
  } catch (error) {
    logger.error({ jid, err: error }, 'menu image and category selector could not be sent')
    throw error
  }
}

module.exports = {
  name: 'menu',
  aliases: ['help', 'aide'],
  desc: 'Open the command menu',
  async run({ sock, jid, msg, prefix, commands, args, isOwner, numero }) {
    const categoryKey = args[0]?.toLowerCase()
    if (categoryKey && !menuCategories[categoryKey]) {
      return sock.sendMessage(jid, {
        text: `𝐔sᴇ ${prefix}menu, ${prefix}allmenu, ${prefix}group, ${prefix}owner, ${prefix}aimenu, ${prefix}tools, ${prefix}fun, ${prefix}mediamenu, ${prefix}downloader ᴏʀ ${prefix}others.`,
      }, { quoted: msg })
    }

    if (menuCategories[categoryKey]?.ownerOnly && !isOwner) {
      return sock.sendMessage(jid, { text: '𝐓ʜɪs ᴄᴀᴛᴇɢᴏʀʏ ɪs ғᴏʀ ᴛʜᴇ ʙᴏᴛ ᴏᴡɴᴇʀ ᴏɴʟʏ.' }, { quoted: msg })
    }

    const text = await menuText({ categoryKey, commands, prefix, msg, numero, isOwner })
    return sendMenu(sock, jid, msg, prefix, text, isOwner)
  },
}
