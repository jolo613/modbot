const con = require("../database");
const {DiscordUserService, TwitchUserService, IdentityService} = require("../api");
const config = require("../config.json");

const https = require("https");

const twitch = require("../twitch/twitch");
const { MessageEmbed } = require("discord.js");

const FOLLOWER_REQUIREMENT = 5000;

let sentMessages = [];

const sendUpdate = identity => {
    if (sentMessages.includes(identity.id + "-" + (identity.profiles.discord.length + identity.profiles.twitch.length))) return;
    
    sentMessages = [
        ...sentMessages,
        identity.id + "-" + (identity.profiles.discord.length + identity.profiles.twitch.length)
    ];

    if (identity.profiles.discord.length === 0 || identity.profiles.twitch.length === 0) return;

    const embed = new MessageEmbed()
            .setTitle("Identity Updated")
            .setURL("https://p.tmsqd.co/#/identity/" + identity.id)
            .setThumbnail(identity.avatar_url)
            .setDescription("Twitch Mod Squad Identity `#" + identity.id + " - " + identity.name + `\` was updated.\n${identity.profiles.twitch.length} twitch account${identity.profiles.twitch.length === 1 ? "" : "s"} and ${identity.profiles.discord.length} discord account${identity.profiles.discord.length === 1 ? "" : "s"} are linked.`);

    let twitchProfiles = "";

    identity.profiles.twitch.forEach(tProfile => {
        twitchProfiles += `\n${tProfile.display_name}${tProfile.affiliation === "partner" ? " ✓" : ""}`;
    });

    if (twitchProfiles === "") twitchProfiles = "\nNo Twitch profiles are linked.";

    let discordProfiles = "";

    identity.profiles.discord.forEach(dProfile => {
        discordProfiles += `\n${dProfile.name}#${dProfile.discriminator}`;
    });

    if (discordProfiles === "") discordProfiles = "\nNo Discord profiles are linked.";

    let roles = "The following roles were added:";

    getRoles(identity).forEach(role => {
        roles += "\n• <@&" + role + ">";
    });

    let streamers = "";
    let other = "";

    identity.streamers.forEach(streamer => {
        streamer.profiles.twitch.forEach(strTwitch => {
            let string = `\n${strTwitch.display_name} ${strTwitch.affiliation === "partner" ? " ✓" : ""}`;

            if (streamer.active) {
                streamers += string;
            } else {
                other += string;
            }
        })
    });

    embed.addField("Twitch Profiles", "```" + twitchProfiles + "```", true);
    embed.addField("Discord Profiles", "```" + discordProfiles + "```", true);

    embed.addField("Roles", roles, false);

    if (streamers !== "") {
        embed.addField("Authorized Channels", "```" + streamers + "```");
    }
    if (other !== "") {
        embed.addField("Inactive Channels", "These channels did not meet the " + FOLLOWER_REQUIREMENT + " follower requirement.\n```" + other + "```")
    }

    let channel = global.client.discord.guilds.resolve(config.modsquad_discord).channels?.resolve(config.notification_channel);

    if (channel === undefined || channel === null) {
        console.error("Could not retrieve TMS notification channel");
    } else {
        channel.send({content: " ", embeds: [embed]})
    }
}

const getRoles = identity => {
    let roles = [];

    const addRole = role => {
        if (!roles.includes(role)) {
            roles = [
                ...roles,
                role
            ];
        }
    }
    
    identity.profiles.twitch.forEach(twitch => {
        if (twitch.affiliation === "partner") {
            addRole(config.partnered.streamer);
        }
        if (twitch.affiliation === "affiliate" && twitch.follower_count >= FOLLOWER_REQUIREMENT) {
            addRole(config.affiliate.streamer);
        }
    });

    identity.streamers.forEach(streamer => {
        streamer.profiles.twitch.forEach(twitch => {
            if (twitch.affiliation === "partner") {
                addRole(config.partnered.moderator);
            }
            if (twitch.affiliation === "affiliate" && twitch.follower_count >= FOLLOWER_REQUIREMENT) {
                addRole(config.affiliate.moderator);
            }
        });
    })

    return roles;
}

const updateRoles = identity => {
    let roles = getRoles(identity);
    console.log(roles);
                    
    if (roles.length > 0) {
        identity.profiles.discord.forEach(disc => {
            DiscordUserService.grantDiscordRoles(disc.id, roles);
        });
    }
}

module.exports = () => {
    con.query("select id, display_name, affiliation, identity_id, moderator_checked from twitch__user where identity_id is not null and email is not null and (moderator_checked is null or date_add(moderator_checked, interval 14 day) < now()) limit 2;", (err, res) => {
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

                        console.log(data);

                        if (data.status == 200) {
                            if (data.hasOwnProperty("channels") && data.channels.length > 0) {

                                for (let i = 0; i < data.channels.length; i++) {
                                    let channel = data.channels[i];

                                    try {
                                        let streamer = await TwitchUserService.resolveByName(channel.name);
                                        let streamerIdentity = await TwitchUserService.resolveIdentity(streamer.id, streamer.display_name);

                                        if (channel.followers >= FOLLOWER_REQUIREMENT)
                                            twitch.listenOnChannel(channel.name.toLowerCase());
                                        
                                        await IdentityService.linkModerator(identity.id, streamerIdentity.id, channel.followers >= FOLLOWER_REQUIREMENT);
                                    } catch (e) {
                                        if (e !== "User not found") {
                                            console.error(e);
                                        }
                                    }
                                }

                                con.query("update twitch__user set moderator_checked = now() where id = ?;",[user.id], async () => {
                                    global.websocket.emit({identityId: identity.id}, {type: "streamer-list-updated", data: await IdentityService.getStreamers(identity.id)});
                                    identity = await IdentityService.resolveIdentity(identity.id, undefined, true);

                                    updateRoles(identity);

                                    if (user.moderator_checked === null) {
                                        sendUpdate(identity);
                                    }
                                });
                            } else {
                                con.query("update twitch__user set moderator_checked = now() where id = ?;", [user.id], () => {
                                    global.websocket.emit({identityId: identity.id}, {type: "no-action-notification", data: {title: "Moderation Check Update", description: "Twitch user " + data.user + " was linked, but isn't listed as a moderator anywhere!"}});
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
                if (user.identity_id !== null) {
                    let identity = await IdentityService.resolveIdentity(user.identity_id, undefined, true);
                    
                    updateRoles(identity);

                    sendUpdate(identity);
                }
    
                con.query("update discord__user set streamers_updated = true where id = ?;", [user.id]);
            })
        });
    }, 5000);
};
