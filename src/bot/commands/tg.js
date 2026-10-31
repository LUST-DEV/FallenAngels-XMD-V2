const config = require('../../config')
const logger = require('../../logger')
const { imageToSticker, videoToSticker } = require('../../utils/sticker')

const MAX_TELEGRAM_FILE_BYTES = 16 * 1024 * 1024
const MAX_STICKER_COUNT = 120
const STICKER_SEND_DELAY_MS = 250

function getStickerSetName(link) {
  let url

  try {
    url = new URL(link)
  } catch {
    throw new Error('𝐒ᴇɴᴅ ᴀ ᴠᴀʟɪᴅ 𝐓ᴇʟᴇɢʀᴀᴍ sᴛɪᴄᴋᴇʀ ᴘᴀᴄᴋ ʟɪɴᴋ.')
  }

  const allowedHosts = new Set([
    't.me',
    'www.t.me',
    'telegram.me',
    'www.telegram.me',
  ])

  if (!allowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error(
      '𝐎ɴʟʏ ᴘᴜʙʟɪᴄ ᴛ.ᴍᴇ/addstickers/<pack> ʟɪɴᴋs ᴀʀᴇ sᴜᴘᴘᴏʀᴛᴇᴅ.',
    )
  }

  const match = url.pathname.match(/^\/addstickers\/([A-Za-z0-9_]+)\/?$/)

  if (!match) {
    throw new Error(
      '𝐎ɴʟʏ ᴘᴜʙʟɪᴄ ᴛ.ᴍᴇ/addstickers/<pack> ʟɪɴᴋs ᴀʀᴇ sᴜᴘᴘᴏʀᴛᴇᴅ.',
    )
  }

  return match[1]
}

async function telegramApi(method, params = {}) {
  const endpoint =
    `https://api.telegram.org/bot${config.telegramBotToken}/${method}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(20_000),
  })

  let result

  try {
    result = await response.json()
  } catch {
    throw new Error(`𝐓ᴇʟᴇɢʀᴀᴍ ʀᴇᴛᴜʀɴᴇᴅ ɪɴᴠᴀʟɪᴅ 𝐉𝐒𝐎𝐍 (${response.status}).`)
  }

  if (!response.ok || !result.ok) {
    throw new Error(
      result.description ||
      `𝐓ᴇʟᴇɢʀᴀᴍ 𝐀𝐏𝐈 ʀᴇᴛᴜʀɴᴇᴅ 𝐇𝐓𝐓𝐏 ${response.status}.`,
    )
  }

  return result.result
}

async function downloadTelegramFile(filePath) {
  const endpoint =
    `https://api.telegram.org/file/bot${config.telegramBotToken}/${filePath}`

  const response = await fetch(endpoint, {
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    throw new Error(
      `𝐓ᴇʟᴇɢʀᴀᴍ ғɪʟᴇ ᴅᴏᴡɴʟᴏᴀᴅ ғᴀɪʟᴇᴅ (${response.status}).`,
    )
  }

  if (!response.body) {
    throw new Error('𝐓ᴇʟᴇɢʀᴀᴍ ʀᴇᴛᴜʀɴᴇᴅ ᴀɴ ᴇᴍᴘᴛʏ ғɪʟᴇ sᴛʀᴇᴀᴍ.')
  }

  const declaredLength = Number(
    response.headers.get('content-length') || 0,
  )

  if (declaredLength > MAX_TELEGRAM_FILE_BYTES) {
    throw new Error('𝐀 Tᴇʟᴇɢʀᴀᴍ sᴛɪᴄᴋᴇʀ ᴇxᴄᴇᴇᴅs ᴛʜᴇ 16 𝐌𝐁 ʟɪᴍɪᴛ.')
  }

  const chunks = []
  let totalBytes = 0

  for await (const chunk of response.body) {
    totalBytes += chunk.length

    if (totalBytes > MAX_TELEGRAM_FILE_BYTES) {
      throw new Error('𝐀 Tᴇʟᴇɢʀᴀᴍ sᴛɪᴄᴋᴇʀ ᴇxᴄᴇᴇᴅs ᴛʜᴇ 16 𝐌𝐁 ʟɪᴍɪᴛ.')
    }

    chunks.push(chunk)
  }

  if (!totalBytes) {
    throw new Error('𝐓ᴇʟᴇɢʀᴀᴍ ʀᴇᴛᴜʀɴᴇᴅ ᴀɴ ᴇᴍᴘᴛʏ sᴛɪᴄᴋᴇʀ ғɪʟᴇ.')
  }

  return Buffer.concat(chunks)
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = {
  name: 'tg',
  aliases: ['telegramsticker', 'tgpack'],
  desc: 'Download and send a Telegram sticker pack',
  ownerOnly: true,

  async run({ sock, jid, args, reply }) {
    if (!config.telegramBotToken) {
      return reply(
        '❌ 𝐒ᴇᴛ TELEGRAM_BOT_TOKEN ɪɴ ʏᴏᴜʀ .env ғɪʟᴇ ᴛᴏ ᴇɴᴀʙʟᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ.',
      )
    }

    if (!args?.[0]) {
      return reply(
        '❌ 𝐔sᴀɢᴇ: .tg https://t.me/addstickers/pack_name',
      )
    }

    let pack

    try {
      const packName = getStickerSetName(args[0])
      pack = await telegramApi('getStickerSet', {
        name: packName,
      })
    } catch (error) {
      logger.warn(
        { jid, err: error.message },
        'Unable to retrieve Telegram sticker pack',
      )

      return reply(`❌ ${error.message}`)
    }

    const stickers = Array.isArray(pack?.stickers)
      ? pack.stickers
      : []

    if (!stickers.length) {
      return reply(
        '❌ 𝐓ʜɪs 𝐓ᴇʟᴇɢʀᴀᴍ ᴘᴀᴄᴋ ᴅᴏᴇs ɴᴏᴛ ᴄᴏɴᴛᴀɪɴ ᴀɴʏ sᴛɪᴄᴋᴇʀs.',
      )
    }

    if (stickers.some(sticker => sticker.is_animated && !sticker.is_video)) {
      return reply(
        '❌ 𝐓ʜɪs ᴘᴀᴄᴋ ᴜsᴇs 𝐓𝐆𝐒 ᴀɴɪᴍᴀᴛᴇᴅ sᴛɪᴄᴋᴇʀs, ᴡʜɪᴄʜ ᴀʀᴇ ɴᴏᴛ sᴜᴘᴘᴏʀᴛᴇᴅ. 𝐒ᴛᴀᴛɪᴄ ᴀɴᴅ ᴠɪᴅᴇᴏ ᴘᴀᴄᴋs ᴀʀᴇ sᴜᴘᴘᴏʀᴛᴇᴅ.',
      )
    }

    if (stickers.length > MAX_STICKER_COUNT) {
      return reply(
        `❌ 𝐓ʜɪs ᴘᴀᴄᴋ ᴄᴏɴᴛᴀɪɴs ${stickers.length} sᴛɪᴄᴋᴇʀs. 𝐓ʜᴇ ᴍᴀxɪᴍᴜᴍ ɪs ${MAX_STICKER_COUNT}.`,
      )
    }

    await reply(
      `📦 𝐃ᴏᴡɴʟᴏᴀᴅɪɴɢ ${stickers.length} sᴛɪᴄᴋᴇʀs ғʀᴏᴍ “${pack.title}”…`,
    )

    let sentCount = 0
    const failures = []

    for (const [index, sticker] of stickers.entries()) {
      try {
        const file = await telegramApi('getFile', {
          file_id: sticker.file_id,
        })

        if (!file?.file_path) {
          throw new Error('𝐓ᴇʟᴇɢʀᴀᴍ ᴅɪᴅ ɴᴏᴛ ʀᴇᴛᴜʀɴ ᴀ ғɪʟᴇ ᴘᴀᴛʜ.')
        }

        const buffer = await downloadTelegramFile(file.file_path)

        const convertedSticker = sticker.is_video
          ? await videoToSticker(buffer)
          : await imageToSticker(buffer)

        await sock.sendMessage(jid, {
          sticker: convertedSticker,
        })

        sentCount += 1
      } catch (error) {
        failures.push(error.message)

        logger.warn(
          { jid, fileId: sticker.file_id, err: error.message },
          'Unable to download or send Telegram sticker',
        )
      }

      if (index < stickers.length - 1) {
        await wait(STICKER_SEND_DELAY_MS)
      }
    }

    if (failures.length) {
      return reply(
        `✅ 𝐒ᴇɴᴛ ${sentCount}/${stickers.length} sᴛɪᴄᴋᴇʀs. ❌ ${failures.length} ғᴀɪʟᴜʀᴇ(s).`,
      )
    }

    return reply(
      `✅ 𝐀ʟʟ ${sentCount} sᴛɪᴄᴋᴇʀs ᴡᴇʀᴇ sᴇɴᴛ sᴜᴄᴄᴇssғᴜʟʟʏ.`,
    )
  },
}