const con = require("./database");
const config = require("./config.json");

const {ApiClient} = require("twitch");
const {ClientCredentialsAuthProvider} = require("twitch-auth");

const authProvider = new ClientCredentialsAuthProvider(config.twitch.client_id, config.twitch.client_secret);
const api = new ApiClient({ authProvider });

class IdentityService {
    resolveIdentity(identityId) {
        return new Promise((resolve, reject) => {
            let identity = {};
            con.query("select id, name from identity where id = ?;", [identityId], (err, res) => {
                if (err) {reject(err);return;}

                if (res.length > 0) {
                    const tus = new TwitchUserService();
                    const dus = new DiscordUserService();

                    identity.id = res[0].id;
                    identity.name = res[0].name;

                    tus.resolveIdentityProfiles(identityId).then(twitchProfiles => {
                        identity.profiles = {twitch: twitchProfiles};

                        dus.resolveIdentityProfiles(identityId).then(discordProfiles => {
                            identity.profiles.discord = discordProfiles;

                            resolve(identity);
                        })
                    }).catch(reject);
                } else {
                    reject("Identity not found");
                }
            });
        });
    }
}

class TwitchUserService {

    #resolveUserObj(result) {
        return {
            id: result.id,
            display_name: result.display_name,
            profile_image_url: result.profile_image_url,
            offline_image_url: result.offline_image_url,
            description: result.description,
            view_count: result.view_count,
            follower_count: result.follower_count,
            affiliation: result.affiliation,
            identity: {
                id: result.identity_id,
                name: result.identity_name
            },
        };
    }

    resolveByName(userName) {
        return new Promise((resolve, reject) => {
            con.pquery("select id, display_name, identity_id, identity.name as identity_name, email, profile_image_url, offline_image_url, description, view_count, follower_count, affiliation from twitch__user join identity on identity.id = twitch__user.identity_id where display_name = ?;", [userName]).then(result => {
                if (result.length > 0) {
                    let user = result[0];
                    resolve(this.#resolveUserObj(user));
                } else {

                }
            }).catch(reject);
        });
    }

    resolveById(userId) {
        return new Promise((resolve, reject) => {
            con.pquery("select id, display_name, identity_id, identity.name as identity_name, email, profile_image_url, offline_image_url, description, view_count, follower_count, affiliation from twitch__user join identity on identity.id = twitch__user.identity_id where id = ?;", [userId]).then(result => {
                if (result.length > 0) {
                    let user = result[0];
                    resolve(this.#resolveUserObj(user));
                } else {

                }
            }).catch(reject);
        });
    }

    resolveIdentityProfiles(identityId) {
        return new Promise((resolve, reject) => {
            con.query("select id, display_name, identity_id, profile_image_url, offline_image_url, description, view_count, follower_count, affiliation from twitch__user where identity_id = ?;", identityId, (err, res) => {
                if (err) {reject(err);return;}

                resolve(res);
            });
        });
    }

}

class DiscordUserService {
    resolveIdentityProfiles(identityId) {
        return new Promise((resolve, reject) => {
            con.query("select id, name, discriminator, avatar, identity_id from discord__user where identity_id = ?;", identityId, (err, res) => {
                if (err) {reject(err);return;}

                resolve(res);
            });
        });
    }
}

module.exports = {
    IdentityService,
    TwitchUserService,
    DiscordUserService,
    TwitchAPI: api,
}