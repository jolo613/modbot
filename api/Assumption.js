const ReturnableObject = require("./ReturnableObject");

const AssumedDiscordUser = require("./Discord/AssumedDiscordUser");
const AssumedTwitchUser = require("./Twitch/AssumedTwitchUser");

/**
 * Contains information on how a search query relates to a returned record.
 * 
 * See also: {@link AssumedDiscordUser}, {@link AssumedTwitchUser}
 */
class Assumption extends ReturnableObject {
    /**
     * Property which lead to the assumption
     * 
     * @type {string}
     */
    property;

    /**
     * Value contained in the search query
     * @type {string}
     */
    queryValue;

    /**
     * Value which is contained in this record, replacing the search query
     * @type {string}
     */
    actualValue;

    /**
     * Constructor for an Assumption
     * @param {string} type 
     * @param {string} property 
     * @param {string} queryValue 
     * @param {string} actualValue 
     */
    constructor(type, property, queryValue, actualValue) {
        super(type);

        this.property = property;
        this.queryValue = queryValue;
        this.actualValue = actualValue;
    }
}

module.exports = Assumption;