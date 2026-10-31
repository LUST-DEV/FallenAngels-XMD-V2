const { runAiProvider } = require('../aiProvider')

module.exports = {
  name: 'mistral',
  desc: 'Ask Mistral AI a question',
  async run(context) {
    return runAiProvider('mistral', context)
  },
}
