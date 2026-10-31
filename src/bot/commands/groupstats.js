const { groupstats } = require('../groupCommands')

module.exports = {
  name: 'groupstats',
  desc: 'Show current group statistics',
  run: groupstats,
}
