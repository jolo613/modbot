const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const {Router} = require("express");
const {TwitchUserService, BackendAPI} = require("../../api");

const config = require("../../config.json");

const https = require("https");
 
const router = Router();

const TWITCH_URL = "https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=qsedbwr82672tfg7fvobxlf01ljoov&redirect_uri=https%3A%2F%2Fapi.tmsqd.co%2Fauth%2Ftwitch&scope=user%3Aread%3Aemail";
const TWITCH_REDIRECT = "https://api.tmsqd.co/auth/twitch";
const DISCORD_URL = "https://discord.com/api/oauth2/authorize?client_id=819821932253937686&redirect_uri=https%3A%2F%2Fapi.tmsqd.co%2Fauth%2Fdiscord&response_type=code&scope=guilds.join%20identify";
const DISCORD_REDIRECT = "https://api.tmsqd.co/auth/discord";

const discord = {
    async getToken(code) {
        const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: config.discord_auth.client_id,
                client_secret: config.discord_auth.secret_id,
                code,
                grant_type: 'authorization_code',
                redirect_uri: DISCORD_REDIRECT,
                scope: 'identify',
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        return await oauthResult.json();
    },
    async getUser(tokenType, accessToken) {
        const userResult = await fetch('https://discord.com/api/users/@me', {
            method: 'GET',
            headers: {
                authorization: `${tokenType} ${accessToken}`,
            },
        });
        return await userResult.json();
    }
};

const twitch = {
    async getToken(code) {
        const oauthResult = await fetch("https://id.twitch.tv/oauth2/token", {
            method: 'POST',
            body: new URLSearchParams({
                client_id: config.twitch.client_id,
                client_secret: config.twitch.client_secret,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: TWITCH_REDIRECT,
            }),
        });

        return await oauthResult.json();
    },
    async getUser(tokenType, accessToken) {
        console.log({
            method: 'GET',
            headers: {
                ["Client-ID"]: config.twitch.client_id,
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const userResult = await fetch('https://api.twitch.tv/helix/users', {
            method: 'GET',
            headers: {
                ["Client-ID"]: config.twitch.client_id,
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return await userResult.json();
    },
    getModerators(user) {
        return new Promise((res, rej) => {
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
    }
}

router.get("/twitch", async ({query}, res) => {
    const { code } = query;

    if (code) {
        const oauthData = await twitch.getToken(code);

        if (oauthData.hasOwnProperty("status") && oauthData.status === 400) {
            res.redirect(TWITCH_URL);
        }

        console.log(oauthData);

        const user = await twitch.getUser(oauthData.token_type, oauthData.access_token);
        res.json(user);
    } else {
        res.redirect(TWITCH_URL);
    }
});

router.get('/discord', async ({ query, cookies }, res) => {
	const { code } = query;
    const { session } = cookies;

    if (!session) {
        BackendAPI.createSession();
    }

	if (code) {
		try {
			const oauthData = await discord.getToken(code);
            const user = await discord.getUser(oauthData.token_type, oauthData.access_token);

            if (user.hasOwnProperty("message") && user.message === "401: Unauthorized")  {
                res.redirect(DISCORD_URL);
                return;
            }
            res.json(user);
		} catch (error) {
			// NOTE: An unauthorized token will not throw an error;
			// it will return a 401 Unauthorized response in the try block above
			console.error(error);
            res.json({success: false, error: "An error occurred"});
		}
	} else {
        res.redirect(DISCORD_URL);
    }
});
 
module.exports = router;