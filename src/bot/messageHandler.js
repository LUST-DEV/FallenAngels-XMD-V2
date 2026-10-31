const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const { User, CommandLog } = require('../database')
const logger = require('../logger')
const commands = require('./commands')
const { handleAfkMessage } = require('./afk')
const { withNewsletterContext } = require('./newsletterContext')
const { getPrefix } = require('./userCache')
const menuCategories = new Set(['group', 'owner', 'aimenu', 'tools', 'fun', 'mediamenu', 'downloader', 'others'])
const commandReactions = new Map([
    ['accept', '✅'],
    ['acceptall', '✅'],
    ['add', '➕'],
    ['afk', '💤'],
    ['ai', '🤖'],
    ['brightness', '☀️'],
    ['calc', '🧮'],
    ['caption', '📝'],
    ['country', '🌍'],
    ['contrast', '🎚️'],
    ['crypto', '📈'],
    ['demote', '⬇️'],
    ['fact', '💡'],
    ['groupinfo', 'ℹ️'],
    ['groupstats', '📊'],
    ['grayscale', '⚫'],
    ['grouplink', '🔗'],
    ['id', '🆔'],
    ['imagine', '🎨'],
    ['invert', '🔄'],
    ['joke', '😂'],
    ['kick', '👢'],
    ['lyrics', '🎼'],
    ['poll', '📊'],
    ['topchat', '📈'],
    ['togif', '🎞️'],
    ['profile', '👤'],
    ['play', '🔍'],
    ['audio', '🔍'],
    ['promote', '⬆️'],
    ['qr', '🔳'],
    ['quote', '💬'],
    ['reject', '❌'],
    ['rejectall', '❌'],
    ['rules', '📜'],
    ['saturate', '🎨'],
    ['sepia', '🟤'],
    ['sharpen', '🔎'],
    ['ship', '💞'],
    ['sign', '✍️'],
    ['translate', '🌐'],
    ['warn', '⚠️'],
    ['warnings', '📋'],
    ['weather', '🌦️'],
    ['vintage', '📷'],
    ['wiki', '📚'],
    ['menu', '🗂'],
    ['mirror', '🪞'],
    ['pixelate', '🟪'],
    ['shipping', '💞']
])

function getText(content, numero) {
    const text = (
        content.conversation ||
        content.extendedTextMessage?.text ||
        content.imageMessage?.caption ||
        content.videoMessage?.caption ||
        content.listResponseMessage?.singleSelectReply?.selectedRowId ||
        content.buttonsResponseMessage?.selectedButtonId ||
        content.templateButtonReplyMessage?.selectedId ||
        ''
    )
    if (text) return text

    const paramsJson = content.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
    if (!paramsJson) return ''

    try {
        const response = JSON.parse(paramsJson)
        const selectedId = response?.id || response?.selectedId || response?.selectedRowId
        return typeof selectedId === 'string' ? selectedId : ''
    } catch (error) {
        logger.warn({ numero, err: error.message }, 'unable to parse interactive menu response')
        return ''
    }
}

module.exports = async (sock, numero, msg) => {
    const jid = msg.key.remoteJid
    if (!msg.message || jid === 'status@broadcast') return

    const content = normalizeMessageContent(msg.message)
    const text = getText(content, numero).trim()
    const prefix = await getPrefix(numero)
    const user = await User.findByPk(numero, { attributes: ['autotyping', 'botMode'] })
    const isOwner = !!msg.key.fromMe
    const autotyping = !isOwner && user?.autotyping === true && user?.botMode !== 'private'
    let typingStarted = false

    if (autotyping) {
        try {
            await sock.presenceSubscribe(jid)
        } catch (error) {
            logger.warn({ numero, jid, err: error.message }, 'unable to subscribe to chat presence')
        }

        try {
            await sock.sendPresenceUpdate('composing', jid)
            typingStarted = true
            const typingDelay = Math.max(1000, Math.min(3500, text.length * 45))
            await new Promise((resolve) => setTimeout(resolve, typingDelay))
        } catch (error) {
            logger.warn({ numero, jid, err: error.message }, 'unable to show the typing indicator')
        }
    }

    try {
        await handleAfkMessage(sock, numero, msg, content, text, prefix)
        if (!text) return

        if (!text.startsWith(prefix)) return

        const [name, ...commandArgs] = text.slice(prefix.length).trim().split(/\s+/)
        if (!name) return
        const commandName = name.toLowerCase()
        const cmd = menuCategories.has(commandName)
            ? commands.get('menu')
            : commands.get(commandName)
        const args = menuCategories.has(commandName)
            ? [commandName === 'aimenu' ? 'ai' : commandName === 'mediamenu' ? 'media' : commandName, ...commandArgs]
            : commandArgs
        if (!cmd) return

        if (cmd.ownerOnly && !isOwner) return
        if (!isOwner && user?.botMode === 'private') return

        const commandSock = [
            'groupinfo', 'groupstats', 'grouplink', 'id', 'menu', 'pair', 'ping', 'profile',
            'shorten', 'topchat', 'uuid', 'evenement', 'gstories', 'gstoriesall',
        ].includes(cmd.name)
            ? sock
            : withNewsletterContext(sock)
        const reply = (replyText) => commandSock.sendMessage(jid, { text: replyText }, { quoted: msg })

        const reaction = commandReactions.get(cmd.name)
        if (reaction) {
            try {
                await sock.sendMessage(jid, { react: { text: reaction, key: msg.key } })
            } catch (error) {
                logger.warn({ numero, command: cmd.name, err: error.message }, 'unable to react to command')
            }
        }

        await cmd.run({ sock: commandSock, msg, jid, args, prefix, numero, reply, isOwner, commands })
        await CommandLog.create({ numero, command: cmd.name })
    } finally {
        if (typingStarted) {
            try {
                await sock.sendPresenceUpdate('paused', jid)
            } catch (error) {
                logger.warn({ numero, jid, err: error.message }, 'unable to stop the typing indicator')
            }
        }
    }
}
