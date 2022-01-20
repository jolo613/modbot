const Punishment = require("../Punishment");

class TwitchPunishment extends Punishment {
    /**
     * Channel where the punishment occurred
     * 
     * @type {TwitchUser}
     */
    channel;

    /**
     * User who was punished
     * 
     * @type {TwitchUser}
     */
    user;

    /**
     * Whether the punishment is active or not
     * 
     * @type {boolean}
     */
    active;

    /**
     * Constructor for a TwitchPunishment
     * @param {number} id 
     * @param {TwitchUser} channel 
     * @param {TwitchUser} user 
     * @param {Date} time 
     * @param {boolean} active 
     */
    constructor(id, channel, user, time, active) {
        super(id, time, discord_message);

        this.channel = channel;
        this.user = user;
        this.active = active;
    }
}

module.exports = TwitchPunishment;