const {Discord} = require("../../api/index");
const registerCommand = require("../commands/register");

const listener = {
    name: 'guildCreate',
    eventName: 'guildCreate',
    eventType: 'on',
    listener (guild) {
        Discord.getGuild(guild.id).then(() => {}).catch(err => {
            guild.commands.create(registerCommand.data).then(command => {
                command.permissions.set({guild: guild.id, command: command.id, permissions: [{
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
    }
};

module.exports = listener;