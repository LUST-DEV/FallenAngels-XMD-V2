const { randomInt } = require('node:crypto')

function parseRgbInput(input) {
  const hexMatch = input.match(/^#?([a-f\d]{3}|[a-f\d]{6})$/i)
  if (hexMatch) {
    let hex = hexMatch[1]
    if (hex.length === 3) hex = [...hex].map((character) => character + character).join('')
    return {
      hex: hex.toUpperCase(),
      rgb: hex.match(/../g).map((value) => parseInt(value, 16)),
    }
  }

  const rgbMatch = input.match(/^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/)
  if (!rgbMatch) return null
  const rgb = rgbMatch.slice(1).map(Number)
  if (rgb.some((value) => value > 255)) return null
  const hex = rgb.map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()
  return { hex, rgb }
}

function rgbToHsl([red, green, blue]) {
  const channels = [red, green, blue].map((value) => value / 255)
  const max = Math.max(...channels)
  const min = Math.min(...channels)
  const delta = max - min
  const lightness = (max + min) / 2
  let hue = 0
  let saturation = 0

  if (delta) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1))
    switch (max) {
      case channels[0]: hue = ((channels[1] - channels[2]) / delta) % 6; break
      case channels[1]: hue = (channels[2] - channels[0]) / delta + 2; break
      default: hue = (channels[0] - channels[1]) / delta + 4
    }
    hue *= 60
    if (hue < 0) hue += 360
  }

  return [
    Math.round(hue),
    Math.round(saturation * 100),
    Math.round(lightness * 100),
  ]
}

const commands = [
  {
    name: 'password',
    aliases: ['genpass', 'passgen', 'randompass'],
    desc: 'Generate a secure random password',
    async run({ args, reply }) {
      const requestedLength = args[0] ? Number(args[0]) : 16
      if (!Number.isInteger(requestedLength) || requestedLength < 8 || requestedLength > 64) {
        return reply('𝐔sᴀɢᴇ: .password [𝟪-𝟨𝟦] (ᴅᴇғᴀᴜʟᴛ: 𝟣𝟨)')
      }

      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
      const password = Array.from({ length: requestedLength }, () => characters[randomInt(characters.length)]).join('')
      return reply(`🔐 𝐆ᴇɴᴇʀᴀᴛᴇᴅ 𝐏ᴀssᴡᴏʀᴅ (${requestedLength}):\n\`\`\`${password}\`\`\``)
    },
  },
  {
    name: 'age',
    aliases: ['calcage', 'howold', 'myage'],
    desc: 'Calculate an age from a birth date',
    async run({ args, reply }) {
      const match = args.join(' ').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (!match) return reply('𝐔sᴀɢᴇ: .age 𝐃𝐃/𝐌𝐌/𝐘𝐘𝐘𝐘')

      const [, dayText, monthText, yearText] = match
      const day = Number(dayText)
      const month = Number(monthText)
      const year = Number(yearText)
      const birth = new Date(year, month - 1, day)
      const now = new Date()
      if (
        birth.getFullYear() !== year ||
        birth.getMonth() !== month - 1 ||
        birth.getDate() !== day ||
        birth > now
      ) {
        return reply('❌ 𝐏ʟᴇᴀsᴇ ᴇɴᴛᴇʀ ᴀ ᴠᴀʟɪᴅ ᴘᴀsᴛ ᴅᴀᴛᴇ.')
      }

      let years = now.getFullYear() - year
      let months = now.getMonth() - (month - 1)
      let days = now.getDate() - day
      if (days < 0) {
        months--
        days += new Date(now.getFullYear(), now.getMonth(), 0).getDate()
      }
      if (months < 0) {
        years--
        months += 12
      }

      return reply(`🎂 𝐀ɢᴇ: *${years} ʏᴇᴀʀs, ${months} ᴍᴏɴᴛʜs, ${days} ᴅᴀʏs*`)
    },
  },
  {
    name: 'color',
    aliases: ['colorinfo', 'hex', 'rgb', 'colorpicker'],
    desc: 'Show HEX, RGB and HSL color values',
    async run({ sock, jid, msg, args, reply }) {
      const parsed = parseRgbInput(args.join(' '))
      if (!parsed) return reply('𝐔sᴀɢᴇ: .color #FF5733 ᴏʀ .color 255,87,51')

      const [red, green, blue] = parsed.rgb
      const [hue, saturation, lightness] = rgbToHsl(parsed.rgb)
      const imageUrl = `https://singlecolorimage.com/get/${parsed.hex}/200x200`
      return sock.sendMessage(jid, {
        image: { url: imageUrl },
        caption: `🎨 𝐂ᴏʟᴏʀ 𝐈ɴғᴏ\n\n🔵 𝐇𝐄𝐗: #${parsed.hex}\n🔴 𝐑𝐆𝐁: ${red}, ${green}, ${blue}\n🟡 𝐇𝐒𝐋: ${hue}°, ${saturation}%, ${lightness}%`,
      }, { quoted: msg })
    },
  },
  {
    name: 'encode',
    aliases: ['base64encode', 'b64enc'],
    desc: 'Encode text as Base64',
    async run({ args, reply }) {
      const text = args.join(' ')
      if (!text || text.length > 4000) return reply('𝐔sᴀɢᴇ: .encode <ᴛᴇxᴛ> (ᴍᴀx 𝟦𝟢𝟢𝟢 ᴄʜᴀʀᴀᴄᴛᴇʀs)')
      return reply(`🔒 𝐁ᴀsᴇ𝟨𝟦:\n\`\`\`${Buffer.from(text, 'utf8').toString('base64')}\`\`\``)
    },
  },
  {
    name: 'decode',
    aliases: ['base64decode', 'b64dec'],
    desc: 'Decode Base64 text',
    async run({ args, reply }) {
      const encoded = args.join('')
      if (!encoded || encoded.length > 5500) return reply('𝐔sᴀɢᴇ: .decode <ʙᴀsᴇ𝟨𝟦>')
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
        return reply('❌ 𝐈ɴᴠᴀʟɪᴅ 𝐁ᴀsᴇ𝟨𝟦 ɪɴᴘᴜᴛ.')
      }

      const decoded = Buffer.from(encoded, 'base64')
      if (decoded.toString('base64') !== encoded || !Buffer.from(decoded.toString('utf8'), 'utf8').equals(decoded)) {
        return reply('❌ 𝐈ɴᴠᴀʟɪᴅ 𝐁ᴀsᴇ𝟨𝟦 ᴏʀ ɴᴏɴ-𝐔𝐓𝐅-𝟪 ᴛᴇxᴛ.')
      }
      return reply(`🔓 𝐃ᴇᴄᴏᴅᴇᴅ:\n\`\`\`${decoded.toString('utf8')}\`\`\``)
    },
  },
  {
    name: 'palindrome',
    aliases: ['ispalindrome', 'checkpalindrome'],
    desc: 'Check whether text is a palindrome',
    async run({ args, reply }) {
      const text = args.join(' ').trim()
      if (!text) return reply('𝐔sᴀɢᴇ: .palindrome <ᴛᴇxᴛ>')
      const clean = text.normalize('NFKD').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
      const reversed = [...clean].reverse().join('')
      return reply(`🔁 *${text}*\n${clean === reversed ? '✅ 𝐈s ᴀ ᴘᴀʟɪɴᴅʀᴏᴍᴇ.' : '❌ 𝐍ᴏᴛ ᴀ ᴘᴀʟɪɴᴅʀᴏᴍᴇ.'}\n𝐑ᴇᴠᴇʀsᴇᴅ: ${reversed}`)
    },
  },
  {
    name: 'percent',
    aliases: ['percentage', 'pct', 'calcpercent'],
    desc: 'Calculate a percentage',
    async run({ args, reply }) {
      const input = args.join(' ').trim()
      const ofMatch = input.match(/^(\d+(?:\.\d+)?)%?\s+of\s+(\d+(?:\.\d+)?)$/i)
      const outMatch = input.match(/^(\d+(?:\.\d+)?)\s+out\s+of\s+(\d+(?:\.\d+)?)$/i)
      if (ofMatch) {
        const [, percentageText, totalText] = ofMatch
        const percentage = Number(percentageText)
        const total = Number(totalText)
        return reply(`📊 ${percentage}% ᴏғ ${total} = *${((percentage / 100) * total).toFixed(2)}*`)
      }
      if (outMatch) {
        const [, partText, totalText] = outMatch
        const part = Number(partText)
        const total = Number(totalText)
        if (total === 0) return reply('❌ 𝐓ʜᴇ ᴛᴏᴛᴀʟ ᴄᴀɴɴᴏᴛ ʙᴇ ᴢᴇʀᴏ.')
        return reply(`📊 ${part} ᴏᴜᴛ ᴏғ ${total} = *${((part / total) * 100).toFixed(2)}%*`)
      }
      return reply('𝐔sᴀɢᴇ: .percent 20% of 500 ᴏʀ .percent 150 out of 200')
    },
  },
  {
    name: 'timezone',
    aliases: ['timein', 'citytime', 'tzone'],
    desc: 'Show the current time in a time zone or city',
    async run({ args, reply }) {
      const requested = args.join(' ').trim()
      if (!requested || requested.length > 80) {
        return reply('𝐔sᴀɢᴇ: .timezone <𝐈𝐀𝐍𝐀 ᴢᴏɴᴇ ᴏʀ ᴄɪᴛʏ> (ᴇ.ɢ. .timezone Tokyo)')
      }

      let zone = requested
      const supportedZones = typeof Intl.supportedValuesOf === 'function'
        ? Intl.supportedValuesOf('timeZone')
        : []
      if (!supportedZones.includes(zone)) {
        const normalized = requested.replace(/\s+/g, '_').toLowerCase()
        const matches = supportedZones.filter((candidate) => (
          candidate.toLowerCase() === normalized ||
          candidate.toLowerCase().endsWith(`/${normalized}`) ||
          candidate.toLowerCase().includes(normalized)
        ))
        if (matches.length === 1) zone = matches[0]
        else if (matches.length > 1) {
          return reply(`❌ 𝐌ᴜʟᴛɪᴘʟᴇ ᴛɪᴍᴇ ᴢᴏɴᴇs ᴍᴀᴛᴄʜ. 𝐔sᴇ ᴀ ᴢᴏɴᴇ ʟɪᴋᴇ ${matches.slice(0, 3).join(', ')}.`)
        }
      }

      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: zone,
          dateStyle: 'full',
          timeStyle: 'long',
        })
        return reply(`🕐 𝐓ɪᴍᴇ ɪɴ ${zone}\n${formatter.format(new Date())}`)
      } catch (error) {
        if (error instanceof RangeError) return reply('❌ 𝐓ɪᴍᴇ ᴢᴏɴᴇ ɴᴏᴛ ғᴏᴜɴᴅ. 𝐓ʀʏ .timezone America/New_York.')
        throw error
      }
    },
  },
  {
    name: 'moon',
    aliases: ['moonphase', 'lunar', 'lunarphase'],
    desc: 'Show the current moon phase',
    async run({ reply }) {
      const now = new Date()
      const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14)
      const cycle = 29.530588853
      const age = (((now.getTime() - knownNewMoon) / 86_400_000) % cycle + cycle) % cycle
      const phases = [
        { end: 1.84566, emoji: '🌑', name: 'New Moon', desc: 'The moon is not visible' },
        { end: 5.53699, emoji: '🌒', name: 'Waxing Crescent', desc: 'Growing toward first quarter' },
        { end: 9.22831, emoji: '🌓', name: 'First Quarter', desc: 'Half moon, growing' },
        { end: 12.91963, emoji: '🌔', name: 'Waxing Gibbous', desc: 'Growing toward full moon' },
        { end: 16.61096, emoji: '🌕', name: 'Full Moon', desc: 'Fully illuminated' },
        { end: 20.30228, emoji: '🌖', name: 'Waning Gibbous', desc: 'Shrinking from full' },
        { end: 23.99361, emoji: '🌗', name: 'Last Quarter', desc: 'Half moon, shrinking' },
        { end: 27.68493, emoji: '🌘', name: 'Waning Crescent', desc: 'Nearly new moon' },
        { end: cycle, emoji: '🌑', name: 'New Moon', desc: 'The moon is not visible' },
      ]
      const phase = phases.find((entry) => age < entry.end)
      const illumination = Math.round(50 * (1 - Math.cos((age / cycle) * 2 * Math.PI)))
      return reply(`${phase.emoji} 𝐌ᴏᴏɴ 𝐏ʜᴀsᴇ\n\n🌙 ${phase.name}\n📖 ${phase.desc}\n💡 𝐈ʟʟᴜᴍɪɴᴀᴛɪᴏɴ: ${illumination}%\n📅 ${now.toDateString()}`)
    },
  },
  {
    name: 'random',
    aliases: ['randnum', 'randomnumber', 'rng'],
    desc: 'Generate a random number in a range',
    async run({ args, reply }) {
      const min = args[0] === undefined ? 1 : Number(args[0])
      const max = args[1] === undefined ? 100 : Number(args[1])
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min >= max || min < -1_000_000_000 || max > 1_000_000_000) {
        return reply('𝐔sᴀɢᴇ: .random [ᴍɪɴ] [ᴍᴀx] (ɪɴᴛᴇɢᴇʀs ʙᴇᴛᴡᴇᴇɴ -𝟣,𝟢𝟢𝟢,𝟢𝟢𝟢,𝟢𝟢𝟢 ᴀɴᴅ 𝟣,𝟢𝟢𝟢,𝟢𝟢𝟢,𝟢𝟢𝟢)')
      }
      return reply(`🎲 𝐑ᴀɴᴅᴏᴍ ɴᴜᴍʙᴇʀ: *${randomInt(min, max + 1)}*`)
    },
  },
  {
    name: 'choose',
    aliases: ['pick', 'decide', 'randomchoice'],
    desc: 'Choose a random option',
    async run({ args, reply }) {
      const options = args.join(' ').split('|').map((option) => option.trim()).filter(Boolean)
      if (options.length < 2) return reply('𝐔sᴀɢᴇ: .choose ᴏᴘᴛɪᴏɴ 𝟣 | ᴏᴘᴛɪᴏɴ 𝟤')
      const selected = options[randomInt(options.length)]
      return reply(`🎯 𝐈 ᴄʜᴏᴏsᴇ: *${selected}*`)
    },
  },
  {
    name: 'flip',
    aliases: ['coinflip2', 'headortails', 'toss'],
    desc: 'Flip a coin',
    async run({ reply }) {
      const result = randomInt(2) === 0 ? 'HEADS' : 'TAILS'
      return reply(`🪙 𝐂ᴏɪɴ 𝐅ʟɪᴘ: *${result}* ${result === 'HEADS' ? '👑' : '💿'}`)
    },
  },
]

module.exports = commands
