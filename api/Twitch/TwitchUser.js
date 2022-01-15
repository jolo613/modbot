const con = require("../../database");

require("../index");

const User = require("../User");
const Identity = require("../Identity");
const FullIdentity = require("../FullIdentity");

const https = require("https");

const FOLLOWER_REQUIREMENT = 5000;

const config = require("../../config.json");

const {ApiClient} = require("twitch");
const {ClientCredentialsAuthProvider} = require("twitch-auth");

const authProvider = new ClientCredentialsAuthProvider(config.twitch.client_id, config.twitch.client_secret);
const api = new ApiClient({ authProvider });

const tmi = require('tmi.js');

const {listenOnChannel} = require("../../twitch/twitch");

const modClient = new tmi.Client({
    options: { debug: false },
    connection: { reconnect: true },
    identity: {
        username: config.twitch.username,
        password: config.twitch.oauth
    },
});

let connected = false;

modClient.on("connected", () => {
    connected = true;
});

modClient.on("disconnected", () => {
    connected = false;
})

modClient.connect();

const sleep = ms => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * The class for a specific Twitch user
 * @extends User
 */
class TwitchUser extends User {

    /**
     * The display name for the user
     * @type {string}
     */
    display_name;

    /**
     * The email for the user. Only present in users which have authenticated with TMS.
     * @type {?string}
     */
    email;

    /**
     * The profile image URL for the user.
     * @type {?string}
     */
    profile_image_url;

    /**
     * The offline image URL for the user.
     * @type {?string}
     */
    offline_image_url;

    /**
     * The description for the user.
     * @type {?string}
     */
    description;

    /**
     * The total view count for the user.
     * @type {?number}
     */
    view_count;

    /**
     * The total follower count for the user.
     * @type {?number}
     */
    follower_count;

    /**
     * Date the user was last updated
     * @type {?Date}
     */
    last_updated;
    
    /**
     * Affiliation for the user. (partner, affiliate, or blank)
     * @type {?string}
     */
    affiliation;

    /**
     * Date that TMS last updated the moderators for this user
     * @type {?Date}
     */
    moderator_checked;

    /**
     * Constructs a TwitchUser object
     * 
     * @param {number} id 
     * @param {?Identity} identity 
     * @param {string} display_name 
     * @param {?string} email 
     * @param {?string} profile_image_url 
     * @param {?string} offline_image_url 
     * @param {?string} description 
     * @param {?number} view_count 
     * @param {?number} follower_count 
     * @param {?Date} last_updated 
     * @param {?string} affiliation 
     * @param {?Date} moderator_checked 
     */

    constructor(id, identity, display_name, email, profile_image_url, offline_image_url, description, view_count, follower_count, last_updated, affiliation, moderator_checked) {
        super(id, identity);

        this.display_name = display_name;
        this.email = email;
        this.profile_image_url = profile_image_url;
        this.offline_image_url = offline_image_url;
        this.description = description;
        this.view_count = view_count;
        this.follower_count = follower_count;
        this.last_updated = last_updated;
        this.affiliation = affiliation;
        this.moderator_checked = moderator_checked;
    }

    /**
     * Refreshes the follower count. Will NOT post to the database
     * @returns {Promise<number>}
     */
    refreshFollowers() {
        return new Promise(async (resolve, reject) => {
            try {
                this.follower_count = (await api.helix.users.getFollows({followedUser: this.id})).total;

                resolve(this.follower_count);
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Refresh the streamers under a channel name.
     * 
     * @returns {Promise<TwitchUser[]>}
     */
    refreshStreamers() {
        return new Promise((resolve, reject) => {
            let thisUser = this;

            https.request({
                host: "modlookup.3v.fi",
                path: "/api/user-v3/" + this.display_name.toLowerCase() + "?limit=100&cursor="
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

                                if (thisUser.identity === null) {
                                    let identity = new FullIdentity(null, thisUser.display_name, [thisUser], []);
                                    await identity.post();
                                }

                                let streamers = [];
    
                                for (let i = 0; i < data.channels.length; i++) {
                                    let channel = data.channels[i];
    
                                    try {
                                        let user = (await global.api.Twitch.getUserByName(channel.name, true))[0];
                                        await user.refreshFollowers();

                                        if (!user.identity?.id) {
                                            let identity = new FullIdentity(null, user.display_name, [user], []);
                                            await identity.post();
                                        }

                                        if (!streamers.find(streamer => streamer.id == user.id)) {
                                            streamers = [
                                                ...streamers,
                                                user
                                            ];
                                        }

                                        if (user.follower_count >= FOLLOWER_REQUIREMENT) {
                                            listenOnChannel(user.display_name.toLowerCase());
                                        }

                                        con.query("insert into identity__moderator (identity_id, modfor_id, active) values (?, ?, ?) on duplicate key update active = ?;", [thisUser.identity.id, user.identity.id, user.follower_count >= FOLLOWER_REQUIREMENT, user.follower_count >= FOLLOWER_REQUIREMENT]);
                                    } catch (e) {
                                        if (e !== "No users were found!") {
                                            console.error(e);
                                        }
                                    }
                                }

                                resolve(streamers);
                            } else {
                                reject("User was not listed as a moderator anywhere!");
                            }
                        } 
                    } catch (e) {
                        console.error(e);
                    }
                });
            }).end();
        });
    }

    /**
     * Returns the streamers of a certain channel.
     * 
     * @returns {Promise<TwitchUser[]>}
     */
    getStreamers() {
        return new Promise((resolve, reject) => {
            if (!this.identity?.id) {
                resolve([]); // not having an identity currently just returns an empty array as it shouldn't particularly be seen as an error
                return;
            }

            con.query("select tu.id from identity__moderator as im join twitch__user as tu on tu.identity_id = im.modfor_id where im.identity_id = ? and active = true;", [this.identity.id], async (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    let users = [];

                    for (let i = 0; i < res.length; i++) {
                        users = [
                            ...users,
                            await global.api.Twitch.getUserById(res[i].id),
                        ]
                    }

                    resolve(users);
                }
            });
        });
    }

    /**
     * Refresh the moderators under a channel name.
     * Warning: This may take an extended amount of time!
     * 
     * @returns {Promise<TwitchUser[]>}
     */
    refreshMods() {
        return new Promise(async (resolve, reject) => {
            if (!connected) {
                while (!connected) {
                    console.log("WAITING. Mod TMI client has not been activated. This may be a bug!");
                    await sleep(500);
                }
            }

            if (this.identity === null) {
                let identity = new FullIdentity(null, this.display_name, [this], []);
                await identity.post();
            }

            let mods = await modClient.mods(this.display_name);

            let finalMods = [];

            for (let i = 0; i < mods.length; i++) {
                try {
                    let users = await global.api.Twitch.getUserByName(mods[i], true);

                    for (let y = 0; y < users.length; y++) {
                        if (users[y].identity === null) {
                            let identity = new FullIdentity(null, users[y].display_name, [users[y]], []);
                            await identity.post();
                        }

                        if (this.identity?.id && users[y].identity?.id) {
                            con.query("insert into identity__moderator (identity_id, modfor_id, active) values (?, ?, ?) on duplicate key update active = ?;", [users[y].identity.id, this.identity.id, this.follower_count >= FOLLOWER_REQUIREMENT, this.follower_count >= FOLLOWER_REQUIREMENT]);
                        }
                    }

                    finalMods = [
                        ...finalMods,
                        ...users,
                    ];
                } catch (err) {
                    console.log(mods[i]);
                }
            }

            resolve(finalMods);
        });
    }

    /**
     * Updates or creates the user with the information in this Object
     * 
     * @returns {Promise<TwitchUser>}
     */
    post() {
        return new Promise(async (resolve, reject) => {
            if (this.identity) {
                this.identity = await this.identity.post();
            }
            con.query("insert into twitch__user (id, display_name, identity_id, email, profile_image_url, offline_image_url, description, view_count, follower_count, affiliation) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) on duplicate key update display_name = ?, identity_id = ?, email = ?, profile_image_url = ?, offline_image_url = ?, description = ?, view_count = ?, follower_count = ?, affiliation = ?;", [
                this.id,
                this.display_name,
                this.identity?.id,
                this.email,
                this.profile_image_url,
                this.offline_image_url,
                this.description,
                this.view_count,
                this.follower_count,
                this.affiliation,
                this.display_name,
                this.identity?.id,
                this.email,
                this.profile_image_url,
                this.offline_image_url,
                this.description,
                this.view_count,
                this.follower_count,
                this.affiliation,
            ], err => {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }

}

module.exports = TwitchUser;