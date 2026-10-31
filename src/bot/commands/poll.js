const { poll } = require('../groupCommands')

module.exports = {
  name: 'poll',
  aliases: ['vote', 'createpoll'],
  desc: 'Create a WhatsApp poll',
  run: poll,
}
