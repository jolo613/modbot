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

            const commands = await guild.commands.fetch();

            Discord.getGuild(guild.id).then(dGuild => {
                guild.members.cache.forEach(member => {
                    Discord.getUserById(member.id, false, true).then(dUser => {
                        dGuild.addUser(dUser).then(() => {}, console.error);
                    }, console.error);
                });
            }).catch(async err => {
                let registerCmd = commands.find(x => x.name === "register");

                if (!registerCmd) {
                    try {
                        registerCmd = await guild.commands.create(registerCommand.data);
                    } catch (err) {
                        console.error(err);
                        return;
                    }
                }
                
                let permissions = [{
                    id: guild.ownerId,
                    type: 'USER',
                    permission: true,
                }, {
                    id: 267380687345025025, // Override to allow @Twijn#8888 to access /register for debug purposes.
                    type: 'USER',
                    permission: true,
                }];

                registerCmd.permissions.set({guild: guild.id, command: registerCmd.id, permissions: permissions}).then(() => {}).catch(console.error);
            });

            
            let settingCmd = commands.find(x => x.name === "setting");

            if (!settingCmd) {
                try {
                    settingCmd = await guild.commands.create(settingCommand.data);
                } catch (err) {
                    console.error(err);
                    return;
                }
            }
            
            let permissions = [{
                id: guild.ownerId,
                type: 'USER',
                permission: true,
            }, {
                id: 267380687345025025, // Override to allow @Twijn#8888 to access /setting for debug purposes.
                type: 'USER',
                permission: true,
            }];

            settingCmd.permissions.set({guild: guild.id, command: settingCmd.id, permissions: permissions}).then(() => {}).catch(console.error);
        });
    }
};

module.exports = listener;