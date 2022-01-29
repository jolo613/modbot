const {MessageEmbed} = require("discord.js");
const {Discord} = require("../../api/index");

const listener = {
    name: 'logUserBan',
    eventName: 'guildBanAdd',
    eventType: 'on',
    listener (ban) {
        Discord.getGuild(ban.guild.id).then(guild => {
            Discord.getUserById(ban.user.id, false, true).then(user => {
                guild.addUserBan(user).then(() => {}, console.error);
            }).catch(console.error);

            guild.getSetting("lde-enabled", "boolean").then(enabled => {
                if (enabled) {
                    guild.getSetting("lde-channel", "channel").then(async channel => {
                        let author = ban.user;
                        channel.send({content: ' ', embeds: [new MessageEmbed()
                                .setTitle("User Banned")
                                .setDescription(`User ${ban.user} was banned from the guild`)
                                .setColor(0xb53131)
                                .setAuthor({name: author.username, iconURL: author.avatarURL()})]});
                    }).catch(console.error);
                }
            }).catch(console.error);
        }).catch(console.error);
    }
};

module.exports = listener;