const con = require("../../database");
const config = require("../../config.json");

const {MessageEmbed} = require("discord.js");
const tmi = require("../../twitch/twitch");

const uuid = require("uuid");

const generateUUID = userid => {
    return new Promise((resolve, reject) => {
        let genid = uuid.v4();

        // check for duplicate id
        con.query("select link from permalink where link = ?;", [genid], (err, res) => {
            if (err || res.length === 0) {
                // link does not exist, insert and resolve.
                con.query("insert into permalink (link, user_id) values (?, ?);", [genid, userid], inserr => {
                    if (inserr) {
                        reject(inserr);
                    } else {
                        resolve(genid);
                    }
                });
            } else {
                // link does exist, generate a new one
                generateUUID(userid).then(resolve).catch(reject);
            }
        });
    });
}

const getPermalink = userid => {
    return new Promise((resolve, reject) => {
        con.query("select link from permalink where user_id = ?;", [userid], async (cbplerr, cbplres) => {
            if (!cbplerr && cbplres.length >= 1) {
                resolve(cbplres[0].link);
            } else {
                generateUUID(userid).then(resolve).catch(reject);
            }
        });
    });
}

let notModded = [];

module.exports = client => {

    setInterval(() => {
        try {
            con.query("select cb.username, cb.id, cb.streamer, u.discord_id from crossban as cb left join user as u on u.id = cb.by_id where cb.fulfilled = false and cb.time_created < date_sub(now(), interval 1 minute);", (err, res) => {
                if (err) {console.error(err);return;}

                res.forEach(cbRow => {
                    if (!notModded.includes(cbRow.streamer)) {
                        getPermalink(cbRow.id).then(permalink => {
                            tmi.banClient.ban("#" + cbRow.streamer, cbRow.username, "TMSQD: Crossban https://tmsqd.co/x/" + permalink).then(() => {
                                console.log("User was banned.");
    
                                con.query("update crossban set fulfilled = true, alert_discord_id = null where username = ? and streamer = ?;", [cbRow.username, cbRow.streamer], (err, res) => {
                                    if (err) console.error(err);
                                });
                            }).catch(err => {
                                console.error(err);
                                if (err === "no_permission") {
                                    notModded = [...notModded, cbRow.streamer];
                                } else if (err === "already_banned") {
                                    console.log("Already banned. Updating crossban...");
                                    con.query("update crossban set fulfilled = true, alert_discord_id = null where username = ? and streamer = ?;", [cbRow.username, cbRow.streamer], (err, res) => {
                                        if (err) console.error(err);
                                    });
                                }
                            });
                        }).catch(err => console.error(err));
                    }
                });
            });
        } catch (e) {
            console.error(e);
        }
    }, 10 * 1000);

    setInterval(() => {
        notModded = [];
    }, 30 * 60 * 1000);

}