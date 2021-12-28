const con = require("../database");

const FullIdentity = require("./FullIdentity");

class Session {
    /**
     * ID of the session
     * @type {string}
     */
    id;

    /**
     * Identity of the session
     * @type {FullIdentity?}
     */
    identity;

    /**
     * Date the session was created
     * @type {Date}
     */
    created;

    /**
     * Creates a new Session object
     * @param {string} id 
     * @param {FullIdentity} identity 
     * @param {Date} created 
     */
    constructor(id, identity, created) {
        this.id = id;
        this.identity = identity;
        this.created = created;
    }

    /**
     * Updates or creates the session with the information in this Object
     * 
     * @returns {Promise<Session>}
     */
     post() {
        return new Promise(async (resolve, reject) => {
            if (this.identity) {
                this.identity = await this.identity.post();
            }
            con.query("insert into session (id, identity_id) values (?, ?) on duplicate key update identity_id = ?;", [
                this.id,
                this.identity?.id,
                this.identity?.id,
            ], err => {
                if (err) {
                    reject(err);
                } else {
                    con.query("select created from session where id = ?;", [this.id], (err, res) => {
                        if (err) {
                            reject(err);
                        } else if (res.length > 0) {
                            this.created = res[0].created;
                            resolve(this);
                        }
                    });
                }
            });
        })
    }
}

module.exports = Session;