const {MessageEmbed} = require("discord.js");
const {Discord} = require("../../api/index");

const listener = {
    name: 'logUserUnban',
    eventName: 'guildBanRemove',
    eventType: 'on',
    listener (ban) {
        Discord.getGuild(ban.guild.id).then(guild => {
            Discord.getUserById(ban.user.id, false, true).then(user => {
                guild.removeUserBan(user).then(() => {}, console.error);
            }).catch(console.error);

            guild.getSetting("lde-enabled", "boolean").then(enabled => {
                if (enabled) {
                    guild.getSetting("lde-channel", "channel").then(async channel => {
                        let author = ban.user;
                        channel.send({content: ' ', embeds: [new MessageEmbed()
                                .setTitle("User Unbanned")
                                .setDescription(`User ${ban.user} was unbanned from the guild`)
                                .setColor(0x595959)
                                .setAuthor({name: author.username, iconURL: author.avatarURL()})]});
                    }).catch(console.error);
                }
            }).catch(console.error);
        }).catch(console.error);
    }
};

module.exports = listener;