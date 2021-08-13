const con = require("../database");
const API = require("../api");
const TwitchUserService = new API.TwitchUserService();
const IdentityService = new API.IdentityService();

const https = require("https");

const TwitchAPI = API.TwitchAPI;

const FOLLOWER_REQUIREMENT = 5000;

module.exports = () => {
    con.query("select id, display_name from twitch__user where email is not null and (moderator_checked is null or date_add(moderator_checked, interval 7 day) < now());", (err, res) => {
        if (err) return;
        
        res.forEach(async user => {
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
                                data.channels.forEach(async channel => {
                                    try {
                                        let streamer = await TwitchUserService.resolveByName(channel.name);
                                        let streamerIdentity = await TwitchUserService.resolveIdentity(streamer.id, streamer.display_name);

                                        let userIdentity = await TwitchUserService.resolveIdentity(user.id, user.display_name);
                                        
                                        await IdentityService.linkModerator(userIdentity.id, streamerIdentity.id);

                                        con.query("update twitch__user set moderator_checked = now() where id = ?;",[user.id]);
                                    } catch (e) {
                                        if (e !== "User not found") {
                                            console.error(e);
                                        }
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
};
