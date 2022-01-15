const Cache = require("../Cache/Cache");
const Session = require("../Session");

class SessionService {
    cache = new Cache();

    resolveSession(sessionId) {
        return this.cache.get(sessionId, (resolve, reject) => {
            con.query("select id, identity_id, created from session where id = ?;", [sessionId], (err, res) => {
                if (err) {reject(err);return;}

                if (res.length > 0) {
                    resolve(new Session(res[0].id, global.api.getFullIdentity(res[0].identity_id), res[0].created));
                } else {
                    reject("Session not found");
                }
            });
        })
    }
}

module.exports = SessionService;