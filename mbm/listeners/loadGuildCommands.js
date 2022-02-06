const {Discord} = require("../../api/index");
const client = global.client.mbm;
const registerCommand = require("../commands/register");
const settingCommand = require("../commands/setting");

const listener = {
    name: 'loadGuildCommands',
    eventName: 'ready',
    eventType: 'once',
    listener () {
        client.guilds.cache.forEach(guild => {
            Discord.getGuild(guild.id).then(() => {}).catch(err => {
                guild.commands.create(registerCommand.data).then(command => {
                    command.permissions.add({guild: guild.id, command: command.id, permissions: [{
                        id: guild.ownerId,
                        type: 'USER',
                        permission: true,
                    }]}).then(() => {}).catch(console.error);
                }).catch(console.error);
            });

            guild.commands.create(settingCommand.data).then(command => {
                command.permissions.add({guild: guild.id, command: command.id, permissions: [{
                    id: guild.ownerId,
                    type: 'USER',
                    permission: true,
                }]}).then(() => {}).catch(console.error);
            }).catch(console.error);
        });
    }
};

module.exports = listener;