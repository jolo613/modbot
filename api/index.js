const con = require("../database");

const Twitch = require("./Twitch/");
const Discord = require("./Discord/");
const SessionService = require("./Session/");
const Archive = require("./Archive/");

const FullIdentity = require("./FullIdentity");

const Session = require("./Session");

class API {
    /**
     * Base Twitch API.
     * @type {Twitch}
     */
    Twitch = new Twitch();

    /**
     * Base Discord API
     * @type {Discord}
     */
    Discord = new Discord();

    /**
     * Base Session API
     * @type {SessionService}
     */
    Session = new SessionService();

    /**
     * Base Archive API
     * @type {Archive}
     */
    Archive = new Archive();

    /**
     * Returns the FullIdentity for an ID
     * @param {number} id 
     * @returns {Promise<FullIdentity>}
     */
    getFullIdentity(id) {
        return new Promise((resolve, reject) => {
            con.query("select * from identity where id = ?;", [id], async (err, res) => {
                if (!err) {
                    if (res.length > 0) {
                        let i_id = res[0].id;
                        let i_name = res[0].name;
                        let i_auth = res[0].authenticated;

                        resolve(new FullIdentity(
                            i_id,
                            i_name,
                            i_auth,
                            await this.Twitch.getUsersByIdentity(i_id),
                            await this.Discord.getUsersByIdentity(i_id)
                            ));
                    } else {
                        reject("Identity was not found!");
                    }
                } else {
                    reject(err);
                }
            });
        });
    }

    /**
     * Gets a Session object from an ID
     * @param {string} id 
     * @returns {Promise<Session>}
     */
    getSession(id) {
        return new Promise((resolve, reject) => {
            con.query("select * from session where id = ?;", [id], async (err, res) => {
                if (!err) {
                    if (res.length > 0) {
                        let identity = null;

                        if (res[0].identity_id) {
                            identity = await this.getFullIdentity(res[0].identity_id);
                        }

                        resolve(new Session(res[0].id, identity, res[0].created));
                    } else {
                        reject("Session was not found!");
                    }
                } else {
                    reject(err);
                }
            });
        });
    }

    /**
     * Generates a random string of (length) length.
     * @param {number} length 
     * @returns {string} Generated String
     */
    stringGenerator(length = 32) {
        let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let str = '';
        for (let i = 0; i < length; i++) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return str;
    }
}

let api = new API();
global.api = api;
module.exports = api;