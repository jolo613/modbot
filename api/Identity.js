const con = require("../database");

/**
 * Identities a specific "identity," which can consist of Twitch users and/or Discord users.
 */
class Identity {
    /**
     * The ID for this identity. This is a surrogate key defined by TMS.
     * @type {integer}
     */
    id;

    /**
     * The Name for this identity. This is usually defined by the discord user or twitch user that was originally linked with this identity.
     * @type {string}
     */
    name;

    /**
     * Constructor for the Identity class.
     * @param {number} id 
     * @param {string} name 
     */
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }

    /**
     * Updates or creates the identity with the information in this Object
     * 
     * @returns {Promise<Identity>}
     */
    post() {
        return new Promise((resolve, reject) => {
            con.query("insert into identity (id, name) values (?, ?) on duplicate key update name = ?;", [
                this.id,
                this.name,
                this.name,
            ], err => {
                if (err) {
                    reject(err);
                } else {
                    if (this.id === null || this.id === undefined) {
                        con.query("select id, name from identity where name = ? order by id desc limit 1;", [this.name], (err, res) => {
                            if (err) {
                                reject(err);
                            } else if (res.length < 1) {
                                reject("Could not retrieve inserted id.");
                            } else {
                                this.id = res[0].id;
                                resolve(new Identity(res[0].id, res[0].name));
                            }
                        });
                    } else {
                        resolve(new Identity(this.id, this.name));
                    }
                }
            });
        })
    }
}

module.exports = Identity;