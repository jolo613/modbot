const con = require("../database");

const {MessageEmbed} = require("discord.js");

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
     * Whether the user has authenticated properly with TMS or not
     * 
     * @type {boolean}
     */
    authenticated;

    /**
     * Constructor for the Identity class.
     * @param {number} id 
     * @param {string} name 
     * @param {boolean} authenticated
     */
    constructor(id, name, authenticated) {
        this.id = id;
        this.name = name;
        this.authenticated = authenticated;
    }

    /**
     * Generated a Discord Embed for the user.
     * 
     * @returns {Promise<MessageEmbed[]>}
     */
    discordEmbed() {
        return new Promise(async (resolve, reject) => {
            const FullIdentity = require("./FullIdentity");
            const moderatorIn = this instanceof FullIdentity ? await this.getActiveModeratorChannels() : [];

            let embeds = [];

            const identityEmbed = new MessageEmbed()
                    .setAuthor({name: this.name, iconURL: this instanceof FullIdentity ? this.avatar_url : undefined, url: this.getShortlink()})
                    .setFooter({text: "TMS Identity #" + this.id, iconURL: "https://twitchmodsquad.com/assets/images/logo.webp"})
                    .setColor(0x772ce8);

            if (this instanceof FullIdentity) {
                identityEmbed.setThumbnail(this.avatar_url);
            }

            embeds = [identityEmbed];

            if (this instanceof FullIdentity) {
                let moderatorInStr = "";
                moderatorIn.forEach(modLink => {
                    if (moderatorInStr !== "") moderatorInStr += "\n";

                    moderatorInStr += "**"+modLink.modForIdentity.name+"**";

                    if (modLink.modForIdentity.twitchAccounts.length > 0)
                        moderatorInStr += " - [Profile](https://twitch.tv/" + modLink.modForIdentity.twitchAccounts[0].display_name.toLowerCase() + ")";

                    if (modLink.modForIdentity.discordAccounts.length > 0)
                        moderatorInStr += ` - <@${modLink.modForIdentity.discordAccounts[0].id}>`;
                });

                if (moderatorInStr !== "") {
                    identityEmbed.addField("Moderates For", moderatorInStr, false)
                }

                for (let di = 0; di < this.discordAccounts.length; di ++) {
                    embeds = [
                        ...embeds,
                        await this.discordAccounts[di].discordEmbed(),
                    ]
                }

                for (let ti = 0; ti < this.twitchAccounts.length; ti ++) {
                    embeds = [
                        ...embeds,
                        await this.twitchAccounts[ti].discordEmbed(),
                    ]
                }
            }

            resolve(embeds);
        });
    }

    /**
     * Gets TMS short link to user's page
     * @returns {string}
     */
    getShortlink() {
        return "https://tms.to/i/" + this.id;
    }

    /**
     * Updates or creates the identity with the information in this Object
     * 
     * @returns {Promise<Identity>}
     */
    post() {
        return new Promise((resolve, reject) => {
            con.query("insert into identity (id, name, authenticated) values (?, ?, ?) on duplicate key update name = ?, authenticated = ?;", [
                this.id,
                this.name,
                this.authenticated,
                this.name,
                this.authenticated,
            ], err => {
                if (err) {
                    reject(err);
                } else {
                    if (this.id === null || this.id === undefined) {
                        con.query("select id, name, authenticated from identity where name = ? order by id desc limit 1;", [this.name], (err, res) => {
                            if (err) {
                                reject(err);
                            } else if (res.length < 1) {
                                reject("Could not retrieve inserted id.");
                            } else {
                                this.id = res[0].id;
                                resolve(new Identity(res[0].id, res[0].name, res[0].authenticated));
                            }
                        });
                    } else {
                        resolve(new Identity(this.id, this.name, this.authenticated));
                    }
                }
            });
        })
    }
}

module.exports = Identity;