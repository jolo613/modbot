const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const {Router} = require("express");
const con = require("../../database");

const api = require("../../api/index");
const Session = require("../../api/Session");

const config = require("../../config.json");

const FullIdentity = require('../../api/FullIdentity');
const TwitchUser = require('../../api/Twitch/TwitchUser');
const DiscordUser = require('../../api/Discord/DiscordUser');
 
const router = Router();

const PANEL_URL = "https://panel.twitchmodsquad.com";

const TWITCH_URL = "https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=qsedbwr82672tfg7fvobxlf01ljoov&redirect_uri=https%3A%2F%2Fapi.twitchmodsquad.com%2Fauth%2Ftwitch&scope=user%3Aread%3Aemail";
const TWITCH_REDIRECT = "https://api.twitchmodsquad.com/auth/twitch";
const DISCORD_URL = "https://discord.com/api/oauth2/authorize?client_id=819821932253937686&redirect_uri=https%3A%2F%2Fapi.twitchmodsquad.com%2Fauth%2Fdiscord&response_type=code&scope=guilds.join%20identify";
const DISCORD_REDIRECT = "https://api.twitchmodsquad.com/auth/discord";

const FOLLOWER_REQUIREMENT = 5000;

const redirect = (req, res) => {
    if (req.cookies?.hasOwnProperty("return_uri")) {
        res.redirect(req.cookies.return_uri)
    }

    res.redirect(PANEL_URL);
};

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
        const userResult = await fetch('https://api.twitch.tv/helix/users', {
            method: 'GET',
            headers: {
                ["Client-ID"]: config.twitch.client_id,
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return await userResult.json();
    },
}

router.get("/invite/:invite", (req, res) => {
    if (req.params.invite) {
        res.cookie("invite", req.params.invite, {
            secure: true,
            httpOnly: true,
            maxAge: 360000
        });

        res.redirect(TWITCH_URL);
    } else {
        res.json({success: false, error: "Invite parameter not provided"});
    }
});

router.use("/", (req, res, next) => {
    const { invite } = req.cookies;

    if (invite) {
        con.query("select initiated_by from invite where invite = ?;", [invite], (err, res) => {
            if (err) console.error(err);
            
            if (res.length > 0) {
                req.invitee = res[0].initiated_by;
                next();
            } else {
                res.json({success: false, error: "Invalid Invite Link"});
            }
        });
    } else {
        res.json({success: false, error: "Invalid Invite Link"});
    }
});

router.get("/twitch", async (req, res) => {
    const { query, cookies } = req;
    const { code } = query;

    if (code) {
        const oauthData = await twitch.getToken(code);

        if (oauthData.hasOwnProperty("status") && oauthData.status === 400) {
            res.redirect(TWITCH_URL);
        }

        const result = await twitch.getUser(oauthData.token_type, oauthData.access_token);

        if (result.data?.hasOwnProperty(0)) {
            const user = result.data[0];
            api.Twitch.getUserById(user.id, true, true).then(async twitchUser => {
                let session;

                if (cookies.session) {
                    try {
                        session = await api.getSession(cookies.session);
                    } catch (err) {}
                }

                // catch all, if a session isn't present, make one.
                if (session === undefined)
                    session = new Session(api.stringGenerator(32), null, null);


                // attempt to load the identity
                if (twitchUser.identity?.id !== null) {
                    try {
                        session.identity = await api.getFullIdentity(twitchUser.identity.id);
                    } catch(err) {}
                }

                twitchUser.display_name = user.display_name;
                twitchUser.email = user.email;
                twitchUser.profile_image_url = user.profile_image_url;
                twitchUser.offline_image_url = user.offline_image_url;
                twitchUser.description = user.description;
                twitchUser.view_count = user.view_count;
                twitchUser.affiliation = user.affiliation;

                // catch all, if an identity isn't present, make one.
                if (!session.identity) {
                    session.identity = new FullIdentity(null, user.display_name, [twitchUser], []);
                } else if (!session.identity.twitchAccounts.find(x => x.id === twitchUser.id)) {
                    session.identity.twitchAccounts = [
                        ...session.identity.twitchAccounts,
                        twitchUser,
                    ];
                }

                // post that sh!t
                session = await session.post();

                res.cookie("session", session.id, {domain: ".twitchmodsquad.com", maxAge: new Date(Date.now() + 86400000), path: "/", secure: true});
                
                if (session.identity?.discordAccounts?.length > 0) {
                    redirect(req, res);
                } else {
                    res.redirect(DISCORD_URL);
                }
            }, err => {
                console.error(err);
            });
        }
    } else {
        res.redirect(TWITCH_URL);
    }
});

router.get('/discord', async (req, res) => {
    const { query, cookies, invitee } = req;
	const { code } = query;

    let session = undefined;

    if (cookies?.session) {
        try {
            session = await api.getSession(cookies.session);
        } catch (err) {}
    }
    
    if (session === undefined) {
        res.redirect(TWITCH_URL);
        return;
    }

	if (code) {
		try {
			const oauthData = await discord.getToken(code);
            const user = await discord.getUser(oauthData.token_type, oauthData.access_token);

            if (user.hasOwnProperty("message") && user.message === "401: Unauthorized")  {
                res.redirect(DISCORD_URL);
                return;
            }
            
            let dus = new DiscordUser(
                    user.id,
                    null,
                    user.username,
                    user.discriminator,
                    user.avatar
                );

            if (session.identity.discordAccounts.length === 0 && invitee !== null) {
                con.query("insert into invite__uses (invited, invitee) values (?,?) on duplicate key update invitee = ?;", [session.identity.id, invitee, invitee]);
            }

            if (!session.identity.discordAccounts.find(x => x.id === dus.id)) {
                session.identity.discordAccounts = [...session.identity.discordAccounts, dus];
            }

            session = await session.post();

            let partnered = false;
            let affiliate = false;
            let partneredModerator = false;
            let affiliateModerator = false;

            for (let ri = 0; ri < session.identity.twitchAccounts.length; ri++) {
                let twitchAccount = session.identity.twitchAccounts[ri];

                let followers = await twitchAccount.refreshFollowers();

                if (twitchAccount.affiliation === "partner") {
                    partnered = true;
                } else if (twitchAccount.affiliation === "affiliate" && followers >= FOLLOWER_REQUIREMENT) {
                    affiliate = true;
                }

                let streamers = await twitchAccount.refreshStreamers();

                for (let si = 0; si < streamers.length; si++) {
                    let streamer = streamers[si];

                    followers = await streamer.refreshFollowers();
                    console.log(streamer.display_name, followers, streamer.affiliation);
                    if (streamer.affiliation === "partner") {
                        partneredModerator = true;
                    } else if (streamer.affiliation === "affiliate" && followers >= FOLLOWER_REQUIREMENT) {
                        affiliateModerator = true;
                    }
                }
            }

            let resolvedRoles = [];

            if (partnered) {
                resolvedRoles = [
                    ...resolvedRoles,
                    config.partnered.streamer
                ];
            }
            if (affiliate) {
                resolvedRoles = [
                    ...resolvedRoles,
                    config.affiliate.streamer
                ];
            }
            if (partneredModerator) {
                resolvedRoles = [
                    ...resolvedRoles,
                    config.partnered.moderator
                ];
            }
            if (affiliateModerator) {
                resolvedRoles = [
                    ...resolvedRoles,
                    config.affiliate.moderator
                ];
            }

            if (resolvedRoles.length > 0) {
                global.client.discord.guilds.fetch(config.modsquad_discord).then(guild => {
                    guild.members.add(dus.id, {accessToken: oauthData.access_token, roles: resolvedRoles}).then(member => {
                        redirect(req, res);
                    }).catch((err) => {
                        console.error(err);
                        res.json({success: false, error: "Could not add user to Discord"});
                    });
                }).catch((err) => {
                    console.error(err);
                    res.json({success: false, error: "Could not obtain guild"});
                });
            } else {
                res.status(401)
                res.json({success: false, error: "Did not meet join criteria. If you believe this is in error, send this page to @Twijn#8888 on Discord.", session: session});
            }
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