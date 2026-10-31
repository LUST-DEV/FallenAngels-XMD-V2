// Load folder file
const fs = require('fs');
const path = require('path');
const logger = require('../../logger')

const commands = new Map();

for (const file of fs.readdirSync(__dirname)) {
    if (file === 'index.js' || !file.endsWith('.js')) continue

    try {
        const loaded = require(path.join(__dirname, file))
        const entries = Array.isArray(loaded) ? loaded : [loaded]
        for (const cmd of entries) {
            if (!cmd?.name || typeof cmd.run !== 'function') {
                throw new Error('command module must export a named command with a run function')
            }
            commands.set(cmd.name, cmd)
            cmd.aliases?.forEach((alias) => commands.set(alias, cmd))
        }
    } catch (error) {
        logger.error({ file, err: error.message }, 'failed to load bot command')
    }
}

module.exports = commands;