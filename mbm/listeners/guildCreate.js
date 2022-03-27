const {Discord} = require("../../api/index");
const registerCommand = require("../commands/register");
const {MessageEmbed} = require("discord.js");

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

            dGuild.addCommands(guild);
        }).catch(err => {
            const msg = {content: ' ', embeds: [
                new MessageEmbed()
                    .setTitle("Configure MBM for your server")
                    .setDescription("Hello, <@" + guild.ownerId + "> .\n\nPlease finish setting up MBM on your server using the following commands.\n\n`/register` - Register your Discord guild. The command should include the discord user that the guild represents and the twitch username of that user.\n`/setting` - set local settings on how MBM should handle your guild")
                    .setColor(0x9403fc)
                    .setFooter({text: "Enter the above commands in any text channel in your guild.", iconURL: "https://twitchmodsquad.com/assets/images/logo.webp"})
            ]};
            guild.members.fetch(guild.ownerId).then(owner => {
                owner.send(msg).then(() => {}, err => {
                    // TODO: Add backup plan.
                });
            });

            guild.commands.create(registerCommand.data).then(command => {
                command.permissions.set({guild: guild.id, command: command.id, permissions: [{
                    id: guild.ownerId,
                    type: 'USER',
                    permission: true,
                }]}).then(() => {}).catch(console.error);
            }).catch(console.error);
        });
    }
};

module.exports = listener;