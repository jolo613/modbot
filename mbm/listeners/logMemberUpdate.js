const { MessageEmbed } = require("discord.js");
const {Discord} = require("../../api/index");
const con = require("../../database");

const getExecutor = member => {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            // Fetch a couple audit logs than just one as new entries could've been added right after this event was emitted.
            const fetchedLogs = await member.guild.fetchAuditLogs({
                limit: 6,
                type: 'MEMBER_UPDATE'
            }).catch(console.error);
            
            const auditEntry = fetchedLogs.entries.find(a =>
                // Small filter function to make use of the little discord provides to narrow down the correct audit entry.
                a.target.id === member.id &&
                // Ignore entries that are older than 5 seconds to reduce false positives.
                Date.now() - a.createdTimestamp < 5000
            );
        
            // If entry exists, grab the user that deleted the message and display username + tag, if none, display 'Unknown'. 
            resolve(auditEntry?.executor ? auditEntry.executor : null);
        }, 1500);
    });
}

const listener = {
    name: 'logMemberUpdate',
    eventName: 'guildMemberUpdate',
    eventType: 'on',
    listener (oldMember, newMember) {
        Discord.getGuild(oldMember.guildId).then(async guild => {
            const executor = getExecutor(oldMember);
            if (oldMember.nickname !== newMember.nickname) {
                guild.getSetting("lde-user-update-nickname", "boolean").then(updateUsernameEnabled => {
                    const embed = new MessageEmbed()
                        .setTitle("Nickname Changed")
                        .addField("User", newMember.toString(), true)
                        .setColor(0x4c80d4)
                        .setAuthor({name: newMember.username, iconURL: newMember.avatarURL()});

                    if (executor) {
                        embed.addField("Moderator", executor, true);
                    }
                    
                    embed.addField("Old Nickname", "```\n" + oldMember.nickname.replace(/\\`/g, "`").replace(/`/g, "\\`") + "```", false)
                    embed.addField("New Nickname", "```\n" + newMember.nickname.replace(/\\`/g, "`").replace(/`/g, "\\`") + "```", false)
                    channel.send({content: ' ', embeds: [embed]});
                }).catch(console.error);
            }
        }).catch(console.error);
    }
};

module.exports = listener;