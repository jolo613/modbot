const TwitchPunishment = require("./TwitchPunishment");
const TwitchUser = require("./TwitchUser");

class TwitchBan extends TwitchPunishment {
    /**
     * Constructor for a TwitchBan
     * 
     * @param {number} id 
     * @param {TwitchUser} channel 
     * @param {TwitchUser} user 
     * @param {Date} time 
     * @param {number} duration 
     * @param {boolean} active 
     */
    constructor(id, channel, user, time, active) {
        super(id, channel, user, time, active);
    }
}

module.exports = TwitchBan;