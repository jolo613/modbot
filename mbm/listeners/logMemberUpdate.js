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
        console.log("update");
        Discord.getGuild(oldMember.guild.id).then(async guild => {
            const executor = await getExecutor(oldMember);
            if (oldMember.nickname !== newMember.nickname) {
                guild.getSetting("lde-enabled", "boolean").then(enabled => {
                    guild.getSetting("lde-user-update-nickname", "boolean").then(updateUsernameEnabled => {
                        if (enabled && updateUsernameEnabled) {
                            guild.getSetting("lde-channel", "channel").then(async channel => {
                                const embed = new MessageEmbed()
                                    .setTitle("Nickname Changed")
                                    .addField("User", newMember.toString(), true)
                                    .setColor(0x4c80d4)
                                    .setAuthor({name: newMember.user.username, iconURL: newMember.avatarURL()});

                                if (executor && executor.id !== newMember.id)
                                    embed.addField("Moderator", executor.toString(), true);
                                
                                embed.addField("Old Nickname", "```\n" + (oldMember.nickname ? oldMember.nickname.replace(/\\`/g, "`").replace(/`/g, "\\`") : "[unset]") + "```", false)
                                embed.addField("New Nickname", "```\n" + (newMember.nickname ? newMember.nickname.replace(/\\`/g, "`").replace(/`/g, "\\`") : "[unset]") + "```", false)
                                channel.send({content: ' ', embeds: [embed]});
                            }).catch(console.error);
                        }
                    }).catch(console.error);
                }).catch(console.error);
            } 
            if (!oldMember.roles.cache.equals(newMember.roles.cache)) {
                console.log("role diff");
                guild.getSetting("lde-enabled", "boolean").then(enabled => {
                    guild.getSetting("lde-user-update-roles", "boolean").then(userUpdateRoles => {
                        if (enabled && userUpdateRoles) {
                            guild.getSetting("lde-channel", "channel").then(async channel => {
                                const embed = new MessageEmbed()
                                    .setTitle("Roles Changed")
                                    .addField("User", newMember.toString(), true)
                                    .setColor(0x4c80d4)
                                    .setAuthor({name: newMember.user.username, iconURL: newMember.avatarURL()});

                                if (executor && executor.id !== newMember.id)
                                    embed.addField("Moderator", executor.toString(), true);

                                let diff = "";
                                
                                const addDiff = text => {
                                    if (diff !== "") diff += "\n";

                                    diff += text;
                                }

                                newMember.roles.cache.each(role => {
                                    if (role.name !== "@everyone" && !oldMember.roles.cache.has(role.id))
                                        addDiff("**+** " + role.toString());
                                });

                                oldMember.roles.cache.each(role => {
                                    if (role.name !== "@everyone" && !newMember.roles.cache.has(role.id))
                                        addDiff("**-** " + role.toString());
                                });

                                embed.addField("Role Changes", diff, false);
                                
                                let oldRoles = "";
                                let newRoles = "";

                                oldMember.roles.cache.each(role => {
                                    if (role.name !== "@everyone")
                                        oldRoles += role.toString() + " ";
                                })
                                newMember.roles.cache.each(role => {
                                    if (role.name !== "@everyone")
                                        newRoles += role.toString() + " ";
                                })

                                if (oldRoles === "") oldRoles = "None!";
                                if (newRoles === "") newRoles = "None!";

                                embed.addField("Initial Roles", oldRoles, true);
                                embed.addField("New Roles", newRoles, true);

                                channel.send({content: ' ', embeds: [embed]});
                            }).catch(console.error);
                        }
                    }).catch(console.error);
                }).catch(console.error);
            }
        }).catch(console.error);
    }
};

module.exports = listener;