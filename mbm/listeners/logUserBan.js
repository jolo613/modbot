const {MessageEmbed} = require("discord.js");
const {Discord} = require("../../api/index");

const getBanInfo = ban => {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            // Fetch a couple audit logs than just one as new entries could've been added right after this event was emitted.
            const fetchedLogs = await ban.guild.fetchAuditLogs({
                limit: 6,
                type: 'GUILD_BAN_ADD'
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
    name: 'logUserBan',
    eventName: 'guildBanAdd',
    eventType: 'on',
    listener (ban) {
        Discord.getGuild(ban.guild.id).then(async guild => {
            const banInfo = await getBanInfo(ban);
            let bannedBy = null;

            if (banInfo?.executor?.id) {
                try {
                    bannedBy = await Discord.getUserById(banInfo.executor.id, false, true);
                } catch(err) {
                    console.error(err);
                }
            }

            Discord.getUserById(ban.user.id, false, true).then(user => {
                guild.addUserBan(user, banInfo?.reason ? banInfo.reason : null, bannedBy).then(() => {}, console.error);
            }).catch(console.error);

            guild.getSetting("lde-enabled", "boolean").then(enabled => {
                guild.getSetting("lde-user-ban", "boolean").then(banEnabled => {
                    if (enabled && banEnabled) {
                        guild.getSetting("lde-channel", "channel").then(async channel => {
                            let author = ban.user;
    
                            let embed = new MessageEmbed()
                                    .setTitle("User Banned")
                                    .setDescription(`User ${ban.user} was banned from the guild`)
                                    .setColor(0xb53131)
                                    .setAuthor({name: author.username, iconURL: author.avatarURL()});
    
                            if (banInfo?.reason) {
                                embed.addField("Reason", "`" + banInfo.reason.toString().replace(/\\`/g, "`").replace(/`/g, "\\`") + "`", true);
                            }
    
                            if (banInfo?.executor) {
                                embed.addField("Moderator", banInfo.executor.toString(), true);
                            }
    
                            channel.send({content: ' ', embeds: [embed]});
                        }).catch(console.error);
                    }
                }).catch(console.error);
            }).catch(console.error);
        }).catch(console.error);
    }
};

module.exports = listener;