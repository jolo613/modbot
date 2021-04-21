const con = require("../../database");
const config = require("../../config.json");

const {MessageEmbed} = require("discord.js");
const tmi = require("../../twitch/twitch");

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

module.exports = client => {

    setInterval(() => {
        console.log("crossban interval");
        try {
            con.query("select cb.username, cb.id, cb.streamer, u.discord_id from crossban as cb left join user as u on u.id = cb.by_id where cb.fulfilled = false;", (err, res) => {
                if (err) {console.error(err);return;}

                res.forEach(cbRow => {
                    console.log(cbRow.streamer, config.twitch.username);
                    console.log(tmi.banClient.isMod(cbRow.streamer, config.twitch.username));
                    if (tmi.isModded("#" + cbRow.streamer)) {
                        tmi.banClient.ban(cbRow.streamer, cbRow.username, "TMSQD: Crossban https://tmsqd.co/x/" + getPermalink(cbRow.id));
                    } else {
                        console.warn("Currently skipping streamer " + cbRow.streamer + " as we aren't modded in that channel");
                    }
                });
            });
        } catch (e) {
            console.error(e);
        }
    }, 10000);

}