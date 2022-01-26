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
}

module.exports = DiscordGuild;