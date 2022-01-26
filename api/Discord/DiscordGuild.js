const DiscordUser = require("./DiscordUser");

class DiscordGuild {
    /**
     * The discord ID of the guild that this represents
     * 
     * @type {number}
     */
    id;
    
    /**
     * The discord user that the Guild represents
     * 
     * @type {DiscordUser}
     */
    represents;

    /**
     * The discord user of the owner
     * 
     * @type {DiscordUser}
     */
    owner;

    /**
     * Represents the name of the Guild
     * 
     * @type {string}
     */
    name;

    /**
     * Constructor for a DiscordGuild
     * @param {number} id 
     * @param {DiscordUser} represents 
     * @param {DiscordUser} owner 
     * @param {string} name 
     */
    constructor(id, represents, owner, name) {
        this.id = id;
        this.represents = represents;
        this.owner = owner;
        this.name = name;
    }

    /**
     * Updates or creates the guild with the information in this Object
     * 
     * @returns {Promise<DiscordGuild>}
     */
    post() {
        return new Promise(async (resolve, reject) => {
            con.query("insert into discord__guild (id, represents_id, owner_id, name) values (?, ?, ?, ?) on duplicate key update represents_id = ?, owner_id = ?, name = ?;", [
                this.id,
                this.represents.id,
                this.owner.id,
                this.name,
                this.represents.id,
                this.owner.id,
                this.name
            ], err => {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                    global.api.Discord.guildCache.remove(this.id);
                }
            });
        })
    }
}

module.exports = DiscordGuild;