const con = require("../database");
const API = require("../api");
const config = require("../config.json");
const DiscordUserService = new API.DiscordUserService();
const TwitchUserService = new API.TwitchUserService();
const IdentityService = new API.IdentityService();

const https = require("https");

const twitch = require("../twitch/twitch");

const FOLLOWER_REQUIREMENT = 5000;

module.exports = () => {
    con.query("select id, display_name, affiliation, identity_id from twitch__user where identity_id is not null and email is not null and (moderator_checked is null or date_add(moderator_checked, interval 7 day) < now());", (err, res) => {
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
                                await IdentityService.unlinkModerators(identity.id);

                                if (user.affiliation === "partner") {
                                    identity.profiles.discord.forEach(discordProfile => {
                                        DiscordUserService.grantDiscordRole(discordProfile.id, config.partnered.streamer);
                                    });
                                } else if (user.affiliation === "affiliate") {
                                    identity.profiles.discord.forEach(discordProfile => {
                                        DiscordUserService.grantDiscordRole(discordProfile.id, config.affiliate.streamer);
                                    });
                                }

                                data.channels.forEach(async channel => {
                                    try {
                                        let streamer = await TwitchUserService.resolveByName(channel.name);
                                        let streamerIdentity = await TwitchUserService.resolveIdentity(streamer.id, streamer.display_name);

                                        twitch.listenOnChannel(channel.name.toLowerCase());
                                        
                                        await IdentityService.linkModerator(identity.id, streamerIdentity.id);


                                        if (streamer.affiliation === "partner") {
                                            identity.profiles.discord.forEach(discordProfile => {
                                                DiscordUserService.grantDiscordRole(discordProfile.id, config.partnered.moderator);
                                            });
                                        } else if (streamer.affiliation === "affiliate") {
                                            identity.profiles.discord.forEach(discordProfile => {
                                                DiscordUserService.grantDiscordRole(discordProfile.id, config.affiliate.moderator);
                                            });
                                        }
                                    } catch (e) {
                                        if (e !== "User not found") {
                                            console.error(e);
                                        }
                                    }
                                });

                                con.query("update twitch__user set moderator_checked = now() where id = ?;",[user.id]);
                            }
                        }
                    } catch (e) {
                        console.error(e);
                    }
                });
            }).end();
        });
    });
};
