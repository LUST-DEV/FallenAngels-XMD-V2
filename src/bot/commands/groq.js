const { runAiProvider } = require('../aiProvider')

module.exports = {
  name: 'groq',
  desc: 'Ask Groq AI a question',
  async run(context) {
    return runAiProvider('groq', context)
  },
}
