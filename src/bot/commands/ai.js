const { runAiProvider } = require('../aiProvider')

module.exports = {
  name: 'ai',
  aliases: ['claude'],
  desc: 'Ask the AI assistant a question',
  async run(context) {
    return runAiProvider('claude', context)
  },
}
