const con = require("../../database");

const Identity = require("../Identity");
const DiscordUser = require("./DiscordUser");

const Cache = require("../Cache/Cache");
const AssumedDiscordUser = require("./AssumedDiscordUser");
const Assumption = require("../Assumption");

/**
 * Utility class for Discord services
 */
class Discord {

    /**
     * Discord user cache (ID)
     * 
     * @type {Cache}
     */
    userCache = new Cache();

    /**
     * Transforms SQL response into a response.
     */
    #resolveUser(err, res, resolve, reject) {
        if (err) {
            reject(err);
        } else {
            if (res.length > 0) {
                let row = res[0];
                resolve(new DiscordUser(
                    row.id,
                    row.identity_id === null ? null : new Identity(row.identity_id, row.identity_name, row.authenticated),
                    row.name,
                    row.discriminator,
                    row.avatar
                    ));
            } else {
                reject("User was not found!");
            }
        }
    }

    /**
     * Gets a user based on a Discord user ID.
     * @param {number} id 
     * @param {?boolean} overrideCache
     * 
     * @returns {Promise<DiscordUser>}
     */
    getUserById(id, overrideCache = false) {
        return this.userCache.get(id, (resolve, reject) => {
            con.query("select discord__user.*, identity.name as identity_name, identity.authenticated from discord__user left join identity on discord__user.identity_id = identity.id where discord__user.id = ?;", [id], (err, res) => {
                this.#resolveUser(err, res, resolve, reject);
            });
        }, overrideCache);
    }


    /**
     * Gets a list of users which have/have had a specific name.
     * @param {string} name 
     * @param {boolean} overrideCache 
     * @returns {Promise<AssumedDiscordUser[]>}
     */
    getUserByName(name, overrideCache = false) {
        return new Promise((resolve, reject) => {
            con.query("select id from discord__username where name = ?;", [name], async (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (res.length > 0) {
                    let result = [];
                    for (let i = 0; i < res.length; i++) {
                        let row = res[i];
                        try {
                            let user = await this.getUserById(row.id);
                            result = [
                                ...result,
                                new AssumedDiscordUser(user, [new Assumption("name", name, user.name)]),
                            ];
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    resolve(result);
                } else {
                    reject("No users were found!");
                }
            });
        });
    }


    /**
     * Gets a list of users which have/have had a specific name and discriminator.
     * @param {string} name 
     * @param {string} discriminator
     * @param {boolean} overrideCache 
     * @returns {Promise<AssumedDiscordUser[]>}
     */
    getUserByTag(name, discriminator, overrideCache = false) {
        return new Promise((resolve, reject) => {
            con.query("select id from discord__username where name = ? and discriminator = ?;", [name, discriminator], async (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (res.length > 0) {
                    let result = [];
                    for (let i = 0; i < res.length; i++) {
                        let row = res[i];
                        try {
                            let user = await this.getUserById(row.id);
                            result = [
                                ...result,
                                new AssumedDiscordUser(user, [new Assumption("name", name, user.name), new Assumption("discriminator", discriminator, user.discriminator)]),
                            ];
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    resolve(result);
                } else {
                    reject("No users were found!");
                }
            });
        });
    }

    /**
     * Gets a list of users based on an identity
     * @param {number} id
     * @returns {Promise<DiscordUser[]>}
     */
    getUsersByIdentity(id) {
        return new Promise((resolve, reject) => {
            con.query("select id from discord__user where identity_id = ?;", [id], async (err, res) => {
                if (!err) {
                    let result = [];
                    for (let i = 0; i < res.length; i++) {
                        try {
                            let user = await this.getUserById(res[i].id);
                            result = [
                                ...result,
                                user,
                            ];
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    resolve(result);
                } else {
                    reject(err);
                }
            });
        });
    }
}

module.exports = Discord;