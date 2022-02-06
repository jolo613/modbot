const {Discord} = require("../../api/index");
const client = global.client.mbm;
const registerCommand = require("../commands/register");
const settingCommand = require("../commands/setting");

const listener = {
    name: 'loadGuildCommands',
    eventName: 'ready',
    eventType: 'once',
    async listener () {
        await client.guilds.fetch();
        client.guilds.cache.forEach(async guild => {
            const members = await guild.members.fetch();
            console.log(`Fetched members for ${guild.name}: ${members.size} members`)

            guild.channels.fetch().then(channels => {
                channels.forEach(channel => {
                    if (channel.type === "GUILD_TEXT") {
                        channel.messages.fetch().then(() => {}, console.error); // By default will just fetch 50 messages.
                    }
                });
            }, console.error);

            Discord.getGuild(guild.id).then(dGuild => {
                guild.members.cache.forEach(member => {
                    Discord.getUserById(member.id, false, true).then(dUser => {
                        dGuild.addUser(dUser).then(() => {}, console.error);
                    }, console.error);
                });
            }).catch(err => {
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