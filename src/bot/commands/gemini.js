const { runAiProvider } = require('../aiProvider')

module.exports = {
  name: 'gemini',
  desc: 'Ask Google Gemini a question',
  async run(context) {
    return runAiProvider('gemini', context)
  },
}
