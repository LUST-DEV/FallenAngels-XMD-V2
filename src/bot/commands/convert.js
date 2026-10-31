const units = {
  mm: ['length', 0.001], cm: ['length', 0.01], m: ['length', 1], km: ['length', 1000],
  in: ['length', 0.0254], ft: ['length', 0.3048], yd: ['length', 0.9144], mi: ['length', 1609.344],
  mg: ['mass', 0.001], g: ['mass', 1], kg: ['mass', 1000], oz: ['mass', 28.349523125], lb: ['mass', 453.59237],
  ml: ['volume', 1], l: ['volume', 1000], tsp: ['volume', 4.92892159375], tbsp: ['volume', 14.78676478125],
  cup: ['volume', 236.5882365], gal: ['volume', 3785.411784],
}

function convertTemperature(value, from, to) {
  const celsius = from === 'c' ? value : from === 'f' ? (value - 32) * 5 / 9 : value - 273.15
  return to === 'c' ? celsius : to === 'f' ? celsius * 9 / 5 + 32 : celsius + 273.15
}

module.exports = {
  name: 'convert',
  desc: 'Convert common units and temperatures',
  async run({ args, reply }) {
    if (args.length !== 3 || !Number.isFinite(Number(args[0]))) {
      return reply('𝐔sᴀɢᴇ: .convert <ɴᴜᴍʙᴇʀ> <ғʀᴏᴍ> <ᴛᴏ> (ᴇxᴀᴍᴘʟᴇ: 𝟧 km mi, 𝟥𝟤 f c)')
    }
    const amount = Number(args[0])
    const from = args[1].toLowerCase()
    const to = args[2].toLowerCase()
    let result
    if (['c', 'f', 'k'].includes(from) && ['c', 'f', 'k'].includes(to)) {
      result = convertTemperature(amount, from, to)
    } else {
      const source = units[from]
      const destination = units[to]
      if (!source || !destination || source[0] !== destination[0]) {
        return reply('❌ 𝐔ɴsᴜᴘᴘᴏʀᴛᴇᴅ ᴜɴɪᴛ ᴘᴀɪʀ. 𝐋ᴇɴɢᴛʜ: mm, cm, m, km, in, ft, yd, mi. 𝐌ᴀss: mg, g, kg, oz, lb. 𝐕ᴏʟᴜᴍᴇ: ml, l, tsp, tbsp, cup, gal. 𝐓ᴇᴍᴘ: c, f, k.')
      }
      result = amount * source[1] / destination[1]
    }
    if (!Number.isFinite(result)) return reply('❌ 𝐓ʜᴀᴛ ᴄᴏɴᴠᴇʀsɪᴏɴ ɪs ᴏᴜᴛsɪᴅᴇ ᴛʜᴇ sᴜᴘᴘᴏʀᴛᴇᴅ ʀᴀɴɢᴇ.')
    return reply(`╭─❮ 𓆩 𝐔ɴɪᴛ 𝐂ᴏɴᴠᴇʀᴛᴇʀ 𓆪 ❯\n│ ${amount} ${from} = ${Number(result.toPrecision(10))} ${to}\n╰─────────────────────────`)
  },
}
