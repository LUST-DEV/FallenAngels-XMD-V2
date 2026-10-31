const logger = require('../../logger')
module.exports = {
  name: 'currency',
  desc: 'Convert currencies using current exchange rates',
  async run({ args, reply }) {
    const amount = Number(args[0])
    const from = args[1]?.toUpperCase()
    const to = args[2]?.toUpperCase()
    if (args.length !== 3 || !Number.isFinite(amount) || amount <= 0 || amount > 1e12
      || !/^[A-Z]{3}$/.test(from || '') || !/^[A-Z]{3}$/.test(to || '')) {
      return reply('𝐔sᴀɢᴇ: .currency <ᴀᴍᴏᴜɴᴛ> <ғʀᴏᴍ 𝐈𝐒𝐎> <ᴛᴏ 𝐈𝐒𝐎> (ᴇxᴀᴍᴘʟᴇ: 𝟣𝟢 USD EUR)')
    }
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      })
      if (!response.ok) throw new Error(`Exchange rate service returned HTTP ${response.status}.`)
      const data = await response.json()
      const rate = data?.result === 'success' ? data.rates?.[to] : null
      if (!Number.isFinite(rate) || rate <= 0) return reply(`❌ 𝐔ɴsᴜᴘᴘᴏʀᴛᴇᴅ ᴄᴜʀʀᴇɴᴄʏ ᴄᴏᴅᴇ: ${from} ᴏʀ ${to}.`)
      return reply(`╭─❮ 𓆩 𝐂ᴜʀʀᴇɴᴄʏ 𝐂ᴏɴᴠᴇʀᴛᴇʀ 𓆪 ❯\n│ ${amount.toLocaleString('en-US')} ${from} ≈ ${(amount * rate).toLocaleString('en-US', { maximumFractionDigits: 4 })} ${to}\n│ 𝐑ᴀᴛᴇ ᴜᴘᴅᴀᴛᴇ: ${data.time_last_update_utc || '𝐔ɴᴀᴠᴀɪʟᴀʙʟᴇ'}\n╰─────────────────────────`)
    } catch (error) {
      logger.warn({ from, to, err: error.message }, 'currency conversion failed')
      return reply('❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ғᴇᴛᴄʜ ᴇxᴄʜᴀɴɢᴇ ʀᴀᴛᴇs. 𝐓ʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.')
    }
  },
}
