const FullIdentity = require("../FullIdentity");

/**
 * The class for a specific Session
 */
class Session {
    /**
     * ID for a session
     * 
     * @type {number}
     */
    id;
    
    /**
     * Identity attached to a session
     * 
     * @type {FullIdentity?}
     */
    identity;

    /**
     * Date a session was created
     * 
     * @type {Date}
     */
    created;

    constructor(id, identity, created) {
        this.id = id;
        this.identity = identity;
        this.created = created;
    }
}

module.exports = Session;