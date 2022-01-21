const api = require("..");
const con = require("../../database");
const TwitchChatLog = require("./TwitchChatLog");

class TwitchChat {
    /**
     * Runs a query against Twitch chat logs
     * @param {number=} channel 
     * @param {number=} user 
     * @param {Date=} timeStart 
     * @param {Date=} timeEnd 
     * @param {number=} [limit=200] 
     * @param {number=} [offset=0]
     */
    getLogs(channel = null, user = null, timeStart = null, timeEnd = null, limit = 250, offset = 0) {
        return new Promise((resolve, reject) => {
            if (channel === null && user === null && timeStart === null) {
                reject("Query must have one of the following parameters: channel, user, timeStart");
                return;
            }

            if (typeof(limit) !== "number" || limit > 250) limit = 250;
            if (typeof(offset) !== "number") offset = 0;

            let buildQuery = "";
            let queryParams = [];

            const addToQuery = (query, value) => {
                if (buildQuery !== "") buildQuery += " and ";
                buildQuery += query;
                queryParams = [
                    ...queryParams,
                    value,
                ];
            }

            if (channel !== null) addToQuery("streamer_id = ?", channel);
            if (user !== null) addToQuery("user_id = ?", user);
            if (timeStart !== null) addToQuery("timesent <= ?", timeStart.getUTCMilliseconds());
            if (timeEnd !== null) addToQuery("timesent >= ?", timeEnd.getUTCMilliseconds());
            
            con.query("select * from twitch__chat where " + buildQuery + " limit ?, ?;", [...queryParams, offset, limit], async(err, res) => {
                if (err) {
                    reject(err);
                    return;
                }

                let result = [];

                res.forEach(chatLog => {
                    result = [
                        ...result,
                        new TwitchChatLog(
                            chatLog.id,
                            Number(chatLog.streamer_id),
                            Number(chatLog.user_id),
                            chatLog.message,
                            chatLog.deleted == 1,
                            chatLog.color,
                            new Date(chatLog.timesent),
                        )
                    ]
                });

                let userTable = {};

                for (let i = 0; i < result.length; i++) {
                    let chatLog = result[i];
                    if (!userTable[chatLog.streamer_id]) userTable[chatLog.streamer_id] = await api.Twitch.getUserById(chatLog.streamer_id);

                    if (!userTable[chatLog.user_id]) userTable[chatLog.user_id] = await api.Twitch.getUserById(chatLog.user_id);
                }

                resolve({log: result, user_table: userTable});
            });
        });
    }
}

module.exports = TwitchChat;