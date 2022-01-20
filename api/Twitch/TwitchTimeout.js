const TwitchPunishment = require("./TwitchPunishment");
const TwitchUser = require("./TwitchUser");

class TwitchTimeout extends TwitchPunishment {
    /**
     * Duration of the time out
     * 
     * @type {number}
     */
    duration;

    /**
     * Constructor for a TwitchTimeout
     * 
     * @param {number} id 
     * @param {TwitchUser} channel 
     * @param {TwitchUser} user 
     * @param {Date} time 
     * @param {number} duration 
     * @param {boolean} active 
     */
    constructor(id, channel, user, time, duration, active) {
        super(id, channel, user, time, active);

        this.duration = duration;
    }
}

module.exports = TwitchTimeout;