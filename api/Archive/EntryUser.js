class EntryUser {

    /**
     * Internal ID for the user record
     * @type {number}
     */
    id;
    
    /**
     * Identifies the type of the user.
     * @type {"identity"|"twitch"|"discord"}
     */
    type;

    /**
     * Whether the user entry may be resolved to a user
     * @type {boolean}
     */
    user;

    /**
     * Value of the user entry, either a username or an ID
     * If user = true, this value will always be an ID
     * @type {string}
     */
    value;

    /**
     * Resolves the EntryUser value to the respective user object
     * @returns {Promise<FullIdentity|TwitchUser|DiscordUser>}
     */
    resolveUser() {
        return new Promise((resolve, reject) => {
            if (!this.user) {
                reject("EntryUser is not a user!");
                return;
            }

            if (this.type === "identity") {
                global.api.getFullIdentity(this.value).then(resolve, reject);
            } else if (this.type === "twitch") {
                global.api.Twitch.getUserById(this.value).then(resolve, reject);
            } else if (this.type === "discord") {
                global.api.Discord.getUserById(this.value).then(resolve, reject);
            } else reject("Invalid type");
        });
    }

    /**
     * Resolves a string username for the entry user
     * @returns {Promise<string>}
     */
    resolveName() {
        return new Promise((resolve, reject) => {
            if (!this.user) {
                reject("EntryUser is not a user!");
                return;
            }

            if (this.type === "identity") {
                global.api.getFullIdentity(this.value).then(user => resolve(user.name), reject);
            } else if (this.type === "twitch") {
                global.api.Twitch.getUserById(this.value).then(user => resolve(user.display_name), reject);
            } else if (this.type === "discord") {
                global.api.Discord.getUserById(this.value).then(user => resolve(user.name + "#" + user.discriminator), reject);
            } else reject("Invalid type");
        });
    }

    /**
     * Returns a friendly type for use of displaying.
     * @returns {string}
     */
    getType() {
        if (this.type === "identity") {
            return "Identity";
        } else if (this.type === "discord") {
            return "Discord";
        } else if (this.type === "twitch") {
            return "Twitch";
        } else return "Unknown";
    }

    /**
     * Constructor for an EntryUser
     * 
     * @param {number} id
     * @param {"identity"|"twitch"|"discord"} type
     * @param {boolean} user
     * @param {string} value
     */
    constructor(id, type, user, value) {
        this.id = id;
        this.type = type;
        this.user = user;
        this.value = value;
    }
}

module.exports = EntryUser;