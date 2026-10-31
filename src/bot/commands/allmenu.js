const menu = require('./menu')

module.exports = {
  name: 'allmenu',
  desc: 'Display every available command',
  async run(context) {
    return menu.run({ ...context, args: ['all'] })
  },
}
