const config = require('../config')
const logger = require('../logger')

const MAX_QUESTION_LENGTH = 4000
const SYSTEM_PROMPT = [
  'You are Fallen X Angels, a powerful and helpful AI assistant created by Senior Angels.',
  'If asked who created you, state clearly that you were created by Lord Savage (Savage Dev / Anthravix Society).',
  'Do not claim that OpenAI created you. Do not claim to be ChatGPT.',
  'Do not mention your technical provider or model unless the user directly asks. If asked, answer honestly.',
  'Always respond in the same language used by the user.',
  'Format your answer with its first letter in Unicode bold and all remaining text in small caps. Do not explain this formatting.',
  'Answer the user helpfully, naturally, and with a confident, sharp, and modern tone.',
].join(' ')

const PROVIDERS = {
  claude: {
    label: 'Claude',
    key: () => config.claudeApiKey,
    keyName: 'ANTHROPIC_API_KEY',
    model: () => config.claudeModel,
    defaultModel: 'claude-sonnet-5-5',
    request: (question, model) => ({
      url: 'https://api.anthropic.com/v1/messages',
      init: {
        method: 'POST',
        headers: {
          'x-api-key': config.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: question }],
        }),
      },
    }),
    extractAnswer: (result) => result.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim(),
  },
  gemini: {
    label: 'Gemini',
    key: () => config.geminiApiKey,
    keyName: 'GEMINI_API_KEY',
    model: () => config.geminiModel,
    defaultModel: 'gemini-2.5-flash',
    request: (question, model) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': config.geminiApiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: question }] }],
          generationConfig: { maxOutputTokens: 1200 },
        }),
      },
    }),
    extractAnswer: (result) => result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('\n')
      .trim(),
  },
  groq: {
    label: 'Groq',
    key: () => config.groqApiKey,
    keyName: 'GROQ_API_KEY',
    model: () => config.groqModel,
    defaultModel: 'llama-3.3-70b-versatile',
    request: (question, model) => ({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      init: {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.groqApiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: question },
          ],
        }),
      },
    }),
    extractAnswer: (result) => result.choices?.[0]?.message?.content?.trim(),
  },
  mistral: {
    label: 'Mistral',
    key: () => config.mistralApiKey,
    keyName: 'MISTRAL_API_KEY',
    model: () => config.mistralModel,
    defaultModel: 'mistral-small-latest',
    request: (question, model) => ({
      url: 'https://api.mistral.ai/v1/chat/completions',
      init: {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.mistralApiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: question },
          ],
        }),
      },
    }),
    extractAnswer: (result) => result.choices?.[0]?.message?.content?.trim(),
  },
}

async function runAiProvider(providerName, { args, reply, jid }) {
  const provider = PROVIDERS[providerName]
  if (!provider) throw new Error(`Unsupported AI provider: ${providerName}`)

  const question = args.join(' ').trim()
  if (!question) {
    return reply(`> 🧠 𝐔ꜱᴀɢᴇ: .${providerName} <ʏᴏᴜʀ ǫᴜᴇsᴛɪᴏɴ>`)
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return reply(`> ❌ 𝐘ᴏᴜʀ ǫᴜᴇsᴛɪᴏɴ ɪs ᴛᴏᴏ ʟᴏɴɢ (ᴍᴀxɪᴍᴜᴍ ${MAX_QUESTION_LENGTH} ᴄʜᴀʀᴀᴄᴛᴇʀs). ✨`)
  }

  const apiKey = provider.key()
  if (!apiKey) {
    return reply(`> ⚙️ 𝐓ʜᴇ ${provider.label} 𝐀ɪ ᴘʀᴏᴠɪᴅᴇʀ ɪs ɴᴏᴛ ᴄᴏɴғɪɢᴜʀᴇᴅ. 𝐀ᴅᴅ ${provider.keyName} ᴛᴏ .env.`)
  }

  let response
  try {
    const { url, init } = provider.request(question, provider.model() || provider.defaultModel)
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(45_000),
    })
  } catch (error) {
    logger.warn({ jid, provider: providerName, err: error.message }, 'failed to connect to the AI API')
    return reply('> ❌ 𝐓ʜᴇ 𝐀ɪ sᴇʀᴠɪᴄᴇ ɪs ᴜɴᴀᴠᴀɪʟᴀʙʟᴇ ʀɪɢʜᴛ ɴᴏᴡ. 𝐏ʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ɪɴ ᴀ ғᴇᴡ sᴇᴄᴏɴᴅs.')
  }

  if (!response.ok) {
    logger.warn({ jid, provider: providerName, status: response.status }, 'the AI API rejected the request')
    if (response.status === 401 || response.status === 403) {
      return reply(`> ❌ 𝐓ʜᴇ ${provider.label} 𝐀ɪ ᴀᴘɪ ᴋᴇʏ ɪs ɪɴᴠᴀʟɪᴅ ᴏʀ ᴅᴏᴇs ɴᴏᴛ ʜᴀᴠᴇ ᴀᴄᴄᴇss.`)
    }
    if (response.status === 429) {
      return reply(`> ⚠️ 𝐓ʜᴇ ${provider.label} 𝐀ɪ ʀᴀᴛᴇ ʟɪᴍɪᴛ ᴏʀ ǫᴜᴏᴛᴀ ʜᴀs ʙᴇᴇɴ ʀᴇᴀᴄʜᴇᴅ. 𝐓ʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.`)
    }
    return reply(`> ❌ 𝐓ʜᴇ ${provider.label} 𝐀ɪ ʀᴇǫᴜᴇsᴛ ғᴀɪʟᴇᴅ (HTTP ${response.status}). 𝐓ʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.`)
  }

  let result
  try {
    result = await response.json()
  } catch (error) {
    logger.warn({ jid, provider: providerName, err: error.message }, 'invalid JSON response from AI API')
    return reply(`> ❌ 𝐓ʜᴇ ${provider.label} 𝐀ɪ sᴇʀᴠɪᴄᴇ ʀᴇᴛᴜʀɴᴇᴅ ᴀɴ ᴜɴʀᴇᴀᴅᴀʙʟᴇ ʀᴇsᴘᴏɴsᴇ.`)
  }

  const answer = provider.extractAnswer(result)
  if (!answer) {
    logger.warn({ jid, provider: providerName }, 'AI API returned an empty response')
    return reply(`> ❌ 𝐓ʜᴇ ${provider.label} 𝐀ɪ sᴇʀᴠɪᴄᴇ ᴅɪᴅ ɴᴏᴛ ʀᴇᴛᴜʀɴ ᴀɴ ᴀɴsᴡᴇʀ. 𝐓ʀʏ ʀᴇᴘʜʀᴀsɪɴɢ ʏᴏᴜʀ ǫᴜᴇsᴛɪᴏɴ.`)
  }

  return reply(`> ֎ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs · ${provider.label}\n\n${answer}`)
}

module.exports = { runAiProvider }
