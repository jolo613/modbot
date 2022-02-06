const {Discord} = require("../../api/index");
const registerCommand = require("../commands/register");

const listener = {
    name: 'guildCreate',
    eventName: 'guildCreate',
    eventType: 'on',
    listener (guild) {
        guild.members.fetch().then(members => console.log(`Fetched members for ${guild.name}: ${members.size} members`), console.error);

        guild.channels.fetch().then(channels => {
            channels.forEach(channel => {
                if (channel.type === "GUILD_TEXT") {
                    channel.messages.fetch().then(messages => console.log(`Fetched ${messages.size} messages from ${channel.name}`)); // By default will just fetch 50 messages.
                }
            });
        }, console.error);

        Discord.getGuild(guild.id).then(dGuild => {
            guild.members.forEach(member => {
                Discord.getUserById(member, false, true).then(dUser => {
                    dGuild.addUser(dUser);
                });
            });
        }).catch(err => {
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