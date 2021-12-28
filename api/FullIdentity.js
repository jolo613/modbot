const con = require("../database");

const Identity = require("./Identity");

const TwitchUser = require("./Twitch/TwitchUser");
const DiscordUser = require("./Discord/DiscordUser");

const ModeratorLink = require("./ModeratorLink");

/**
 * Represents a full user identity, including Twitch and Discord accounts.
 * 
 * @extends Identity
 */
class FullIdentity extends Identity {

    /**
     * List of all twitch accounts connected to this identity
     */
    twitchAccounts;

    /**
     * List of all discord accounts connected to this identity
     */
    discordAccounts;

    /**
     * Main constructor for a full identity
     * @param {number} id 
     * @param {string} name 
     * @param {TwitchUser[]} twitchAccounts 
     * @param {DiscordUser[]} discordAccounts 
     */
    constructor(id, name, twitchAccounts, discordAccounts) {
        super(id, name);

        this.twitchAccounts = twitchAccounts;
        this.discordAccounts = discordAccounts;
    }

    /**
     * Gets a list of user identities that this user moderates
     * @param {boolean} fromCache 
     * @returns {ModeratorLink[]}
     */
    getActiveModeratorChannels(fromCache = true) {
        return new Promise((resolve, reject) => {
            con.query("select modfor_id, active from identity__moderator where identity_id = ?;", [this.id], async (err, res) => {
                if (!err) {
                    let result = [];
                    for (let i = 0; i < res.length; i++) {
                        try {
                            let link = new ModeratorLink(await api.getFullIdentity(res[i].modfor_id), this, res[i].active == 1 ? true : false);
                            result = [
                                ...result,
                                link,
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

    /**
     * Updates or creates the identity with the information in this Object
     * 
     * @returns {Promise<FullIdentity>}
     */
    post() {
        return new Promise(async (resolve, reject) => {
            await super.post();

            let identity = new Identity(this.id, this.name);

            for (let i = 0;i < this.twitchAccounts.length;i++) {
                this.twitchAccounts[i].identity = identity;
                this.twitchAccounts[i] = await this.twitchAccounts[i].post();
            }
            
            for (let i = 0;i < this.discordAccounts.length;i++) {
                this.discordAccounts[i].identity = identity;
                this.discordAccounts[i] = await this.discordAccounts[i].post();
            }

            resolve(this);
        })
    }

}

module.exports = FullIdentity;