const con = require("../database");
const {DiscordUserService, TwitchUserService, IdentityService} = require("../api");
const config = require("../config.json");

const https = require("https");

const twitch = require("../twitch/twitch");
const { MessageEmbed } = require("discord.js");

const FOLLOWER_REQUIREMENT = 5000;

module.exports = () => {
    con.query("select id, display_name, affiliation, identity_id, moderator_checked from twitch__user where identity_id is not null and email is not null and (moderator_checked is null or date_add(moderator_checked, interval 7 day) < now());", (err, res) => {
        if (err) return;
        
        res.forEach(async user => {
            let identity = await IdentityService.resolveIdentity(user.identity_id);

            https.request({
                host: "modlookup.3v.fi",
                path: "/api/user-v3/" + user.display_name.toLowerCase() + "?limit=100&cursor="
            }, response => {
                let str = "";

                response.on('data', function (chunk) {
                    str += chunk;
                });

                response.on('end', async function () {
                    try {
                        let data = JSON.parse(str.trim());

                        if (data.status == 200) {
                            if (data.hasOwnProperty("channels") && data.channels.length > 0) {
                                let authstr = [];
                                let roles = [];
                                let notadded = [];

                                const addRole = role => {
                                    if (!roles.includes(role)) {
                                        roles = [
                                            ...roles,
                                            role
                                        ]
                                    }
                                }

                                if (user.affiliation === "partner") {
                                    addRole(config.partnered.streamer);
                                } else if (user.affiliation === "affiliate") {
                                    addRole(config.affiliate.streamer);
                                }

                                for (let i = 0; i < data.channels.length; i++) {
                                    let channel = data.channels[i];

                                    if (channel.followers < FOLLOWER_REQUIREMENT) {
                                        notadded = [...notadded, channel];
                                        continue;
                                    }

                                    try {
                                        let streamer = await TwitchUserService.resolveByName(channel.name);
                                        let streamerIdentity = await TwitchUserService.resolveIdentity(streamer.id, streamer.display_name);

                                        twitch.listenOnChannel(channel.name.toLowerCase());
                                        
                                        await IdentityService.linkModerator(identity.id, streamerIdentity.id);

                                        if (streamer.affiliation === "partner") {
                                            addRole(config.partnered.moderator);
                                        } else if (streamer.affiliation === "affiliate") {
                                            addRole(config.affiliate.moderator);
                                        }

                                        authstr = [...authstr, streamer];
                                    } catch (e) {
                                        if (e !== "User not found") {
                                            console.error(e);
                                        }
                                    }
                                }

                                con.query("update twitch__user set moderator_checked = now() where id = ?;",[user.id], async () => {
                                    global.websocket.emit({identityId: identity.id}, {type: "streamer-list-updated", data: await IdentityService.getStreamers(identity.id)});

                                    if (roles.length > 0) {
                                        identity.profiles.discord.forEach(discordProfile => {
                                            DiscordUserService.revokeDiscordRole(discordProfile.id, config.notlinked_role);
                                        });
                                    }

                                    identity.profiles.discord.forEach(discordProfile => {
                                        DiscordUserService.grantDiscordRoles(discordProfile.id, roles);
                                    });

                                    if (user.moderator_checked === null) {
                                        identity.profiles.discord.forEach(discordProfile => {
                                            // format roles
                                            let roleTxt = "";

                                            roles.forEach(role => {
                                                roleTxt += "\n• <@&"+role+">";
                                            });

                                            if (roles.length === 0) {
                                                roleTxt = "\n• No roles were assigned.";
                                            }

                                            // format authorized streamers
                                            let authStreamers = "";

                                            authstr.forEach(streamer => {
                                                authStreamers += "\n" + streamer.display_name + (streamer.affiliation === "partner" ? " ✓" : "");
                                            })

                                            // format not added streamers
                                            let naStr = "";

                                            notadded.forEach(channel => {
                                                naStr += "\n" + channel.name + " " + channel.followers;
                                            });
    
                                            const embed = new MessageEmbed()
                                                    .setTitle("Account Linked to TMS!")
                                                    .setThumbnail(identity.avatar_url)
                                                    .setDescription(`Twitch User \`${user.display_name}\` was added to discord account <@${discordProfile.id}>!\nThey were granted the following roles:${roleTxt}`)
                                                    .addField("Authorized Channels", "```" + authStreamers + "```");

                                            if (notadded.length > 0) {
                                                embed.addField("Other Channels", "These channels did not meet the requirement of " + FOLLOWER_REQUIREMENT + " followers:```" + naStr + "```");
                                            }

                                            let guild = global.client.discord.guilds.resolve(config.modsquad_discord);
                                            let channel = guild.channels.resolve(config.notification_channel);
                                            channel.send({content: ' ', embeds: [embed]});

                                            con.query("update discord__user set streamers_updated = true where identity_id = ?;", [identity.id]);
                                        });
                                    } else {
                                        console.log("Not notifying discord of changes.");
                                    }
                                });
                            }
                        }
                    } catch (e) {
                        console.error(e);
                    }
                });
            }).end();
        });
    });

    setTimeout(() => {
        con.query("select id, identity_id, streamers_updated from discord__user where streamers_updated = false;", (err, res) => {
            if (err) {console.error(err);return;}
    
            res.forEach(async user => {
                const identity = await IdentityService.resolveIdentity(user.identity_id);
                if (user.identity_id !== null) {
                    con.query("select tu.id, tu.display_name, tu.follower_count, tu.affiliation from identity__moderator as im join twitch__user as tu on tu.identity_id = im.modfor_id where im.identity_id = ?;", [user.identity_id], (err, res) => {
                        if (err) {console.error(err);return;}
                        let authstr = [];
                        let roles = [];
    
                        const addRole = role => {
                            if (!roles.includes(role)) {
                                roles = [
                                    ...roles,
                                    role
                                ]
                            }
                        }
    
                        res.forEach(modfor => {
                            if (modfor.affiliation === "partner") {
                                addRole(config.partnered.moderator);
                            } else if (modfor.affiliation === "affiliate") {
                                addRole(config.affiliate.moderator);
                            }
                            
                            authstr = [...authstr, modfor];
                        });
    
                        DiscordUserService.grantDiscordRoles(user.id, roles);
    
                        if (roles.length > 0) {
                            DiscordUserService.revokeDiscordRole(user.id, config.notlinked_role);
                        }
    
                        let roleTxt = "";
    
                        roles.forEach(role => {
                            roleTxt += "\n• <@&"+role+">";
                        });
    
                        if (roles.length === 0) {
                            roleTxt = "\n• No roles were assigned.";
                        }
    
                        // format authorized streamers
                        let authStreamers = "";
    
                        authstr.forEach(streamer => {
                            authStreamers += "\n" + streamer.display_name + (streamer.affiliation === "partner" ? " ✓" : "");
                        })
    
                        const embed = new MessageEmbed()
                                .setTitle("Account Linked to TMS!")
                                .setThumbnail(identity.avatar_url)
                                .setDescription(`Discord account <@${user.id}> was linked to Identity \`${user.identity_id}\`!\nThey were granted the following roles:${roleTxt}`)
                                .addField("Authorized Channels", "```" + authStreamers + "```");
    
                        let guild = global.client.discord.guilds.resolve(config.modsquad_discord);
                        let channel = guild.channels.resolve(config.notification_channel);
                        channel.send({content: ' ', embeds: [embed]});
                    });
                }
    
                con.query("update discord__user set streamers_updated = true where id = ?;", [user.id]);
            })
        });
    }, 5000);
};
