const {MessageEmbed} = require("discord.js");
const {Discord} = require("../../api/index");
const config = require("../../config.json");

const getUnbanInfo = ban => {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            // Fetch a couple audit logs than just one as new entries could've been added right after this event was emitted.
            const fetchedLogs = await ban.guild.fetchAuditLogs({
                limit: 6,
                type: 'GUILD_BAN_REMOVE'
            }).catch(console.error);

            fetchedLogs.entries.forEach(e => console.log(e.extra));
            const auditEntry = fetchedLogs.entries.find(a =>
                // Small filter function to make use of the little discord provides to narrow down the correct audit entry.
                a.target.id === ban.user.id &&
                // Ignore entries that are older than 5 seconds to reduce false positives.
                Date.now() - a.createdTimestamp < 5000
            );
        
            // If entry exists, grab the user that deleted the message and display username + tag, if none, display 'Unknown'. 
            resolve(auditEntry ? auditEntry : null);
        }, 750);
    });
}

const listener = {
    name: 'logUserUnban',
    eventName: 'guildBanRemove',
    eventType: 'on',
    listener (ban) {
        Discord.getGuild(ban.guild.id).then(async guild => {
            const unbanInfo = await getUnbanInfo(ban);

            Discord.getUserById(ban.user.id, false, true).then(user => {
                guild.removeUserBan(user).then(() => {}, console.error);
            }).catch(console.error);

            guild.getSetting("lde-enabled", "boolean").then(enabled => {
                guild.getSetting("lde-user-unban", "boolean").then(unbanEnabled => {
                    if (enabled && unbanEnabled) {
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

            global.client.discord.channels.fetch(config.liveban_channel).then(banChannel => {
                const embed = new MessageEmbed()
                        .setTitle("Discord User Unbanned!")
                        .setDescription(`User ${ban.user} was unbanned from the guild \`${ban.guild.name}\``)
                        .setURL(`https://tms.to/d/${ban.user.id}`)
                        .setColor(0xb53131)
                        .setAuthor({name: ban.guild.name, iconURL: ban.guild.iconURL()});

                if (unbanInfo?.reason) embed.addField("Reason", "```" + unbanInfo.reason.toString().replace(/\\`/g, "`").replace(/`/g, "\\`") + "```", true);

                if (unbanInfo?.executor) embed.addField("Moderator", unbanInfo.executor.toString(), true);

                banChannel.send({content: ' ', embeds: [embed]});
            });
        }).catch(console.error);
    }
};

module.exports = listener;