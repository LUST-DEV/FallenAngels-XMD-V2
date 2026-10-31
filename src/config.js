require('dotenv').config();
const path = require('path');

const root = path.join(__dirname);
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));

module.exports = {
    botName: "𝐅ᴀʟʟᴇɴ ✘ 𝐀ɴɢᴇʟs",
    botVersion: "2.0.0",
    port: Number(process.env.PORT) || 3000,
    whatsappConnectTimeoutMs: Number(process.env.WHATSAPP_CONNECT_TIMEOUT_MS) || 60000,
    whatsappNewsletterJid: '120363432013190547@newsletter',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    defaultPrefix: process.env.DEFAULT_PREFIX || '.',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    claudeApiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '',
    claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    geminiImageModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-nano-banana-2.1',
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    mistralApiKey: process.env.MISTRAL_API_KEY || '',
    mistralModel: process.env.MISTRAL_MODEL || 'mistral-small-latest',
    removeBgApiKey: process.env.REMOVE_BG_API_KEY || '',
    dataDir,
    sessionsDir: path.resolve(process.env.SESSIONS_DIR || path.join(dataDir, 'sessions')),
    dbPath: path.resolve(process.env.DATABASE_PATH || path.join(dataDir, 'bot.db')),
    assetsDir: path.join(root, '..', 'public', 'assets'),
    menuImagesDir: path.join(root, '..', 'public', 'images'),
    developerContact: 'https://wa.me/50947368210'
}
