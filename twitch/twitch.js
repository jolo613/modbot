const config = require("../config.json");

const tmi = require('tmi.js');
const con = require("../database");

const discordClient = require("../discord/discord");

const {MessageEmbed} = require("discord.js");

let modSquadGuild = null;

let channels = [];
let disallowed_channels = ["@everyone", "modbot", "ludwig"];

let bannedList = [];
let timeoutList = [];

let bannedPerMinute = {};

setInterval(() => {
    for (const [streamer, timestampList] of Object.entries(bannedPerMinute)) {
        let now = Date.now();
        bannedPerMinute[streamer] = timestampList.filter(ts => now - ts < 60000);
    }
}, 1000);

/* I think reason may be deprecated here, so it may always be null. I'll have to check on that. */
const addBan = (channel, userid, username, reason, timebanned) => {
    if (!bannedPerMinute.hasOwnProperty(channel)) {
        bannedPerMinute[channel] = [];
    }
    bannedPerMinute[channel] = [
        ...bannedPerMinute[channel],
        Date.now()
    ];

    if (bannedPerMinute[channel].length > 60) {
        console.log("More than 60 bans per minute in " + channel + ". Parting for 15 minutes.");
        tmi.part(channel.replace('#', ""));

        setTimeout(() => {
            tmi.join(channel.replace('#', ""));
        }, 15 * 60 * 1000);

        return;
    }

    if (bannedPerMinute[channel].length <= 30) {
        con.query("insert into ban (timebanned, channel, userid, username, reason) values (?, ?, ?, ?, ?);", [
            timebanned,
            channel,
            userid,
            username,
            reason
        ]);

        bannedList = [
            ...bannedList,
            {
                channel: channel,
                userid: userid,
                username: username,
            }
        ]
    } else {
        console.log(`Not logging ban in ${channel} due to exceeding BPM threshold (${bannedPerMinute[channel]}>30)`);
    }

    // send ban message, if the liveban channel is present.

    if (bannedPerMinute[channel].length <= 5) {
        if (config.hasOwnProperty("liveban_channel")) {
            let dchnl = modSquadGuild.channels.cache.find(dchnl => dchnl.id == config.liveban_channel);

            if (dchnl.isText()) {
                con.query("select display_name, message, deleted, timesent from chatlog where channel = ? and userid = ? order by timesent desc limit 10;",[
                    channel,
                    userid
                ], (err, res) => {
                    const embed = new MessageEmbed()
                            // Set the title of the field
                            .setTitle(`User was Banned!`)
                            // Set the description of the field
                            .setDescription(`User \`${username}\` was banned from channel \`${channel}\``)
                            // Set the color of the embed
                            .setColor(0xe83b3b);
                    
                    if (typeof(res) === "object") {
                        let logs = "";

                        res = res.reverse();

                        res.forEach(log => {
                            let date = new Date(log.timesent);

                            let hor = date.getHours() + "";
                            let min = date.getMinutes() + "";
                            let sec = date.getSeconds() + "";

                            if (hor.length == 1) hor = "0" + hor;
                            if (min.length == 1) min = "0" + min;
                            if (sec.length == 1) sec = "0" + sec;

                            logs += `\n${hor}:${min}:${sec} [${log.display_name}]: ${log.message}${log.deleted == 1 ? " [deleted]" : ""}`;
                        });

                        if (logs == "") logs = "There are no logs in this channel from this user!";

                        embed.addField(`Chat Log in \`${channel}\``, "```" + logs + "```", false);
                    }

                    dchnl.send(embed).then(message => {
                        con.query("update ban set discord_message = ? where timebanned = ? and channel = ? and userid = ?;", [
                            message.id,
                            timebanned,
                            channel,
                            userid
                        ]);
                    });
                });
            }
        }
    } else {
        console.log(`Not notifying of ban in ${channel} due to exceeding BPM threshold (${bannedPerMinute[channel]}>5)`);
    }
}

const addTimeout = (channel, userid, username, reason, duration, timeto) => {
    con.query("insert into timeout (timeto, channel, userid, username, duration, reason) values (?, ?, ?, ?, ?, ?);", [
        timeto,
        channel,
        userid,
        username,
        duration,
        reason
    ]);

    timeoutList = [
        ...timeoutList,
        {
            channel: channel,
            userid: userid,
            username: username,
            duration: duration,
        }
    ];
}

const isBanned = (channel, userid) => {
    return bannedList.find(bannedRow => bannedRow.channel === channel && bannedRow.userid === userid) !== undefined;
}

const isTimedOut = (channel, userid) => {
    return timeoutList.find(timeoutRow => timeoutRow.channel === channel && timeoutRow.userid === userid) !== undefined;
}

con.query("select channel, username, userid from ban where active = true;", (err, res) => {
    if (err) {console.error(err);return;}

    res.forEach(ban => {
        bannedList = [
            ...bannedList,
            {
                channel: ban.channel,
                userid: ban.userid,
                username: ban.username,
            }
        ]
    });
});

con.query("select channel, username, userid, duration from timeout where active = true;", (err, res) => {
    if (err) {console.error(err);return;}

    res.forEach(timeout => {
        timeoutList = [
            ...timeoutList,
            {
                channel: timeout.channel,
                userid: timeout.userid,
                username: timeout.username,
                duration: timeout.duration,
            }
        ];
    });
});

const client = new tmi.Client({
    options: { debug: true },
    connection: { reconnect: true },
    identity: {
        username: config.twitch.username,
        password: config.twitch.oauth
    },
});

client.connect();

client.on('message', (channel, tags, message, self) => {
    try {
        // Ignore echoed messages.
        if (self) return;

        if (tags.hasOwnProperty("message-type") && tags["message-type"] === "whisper") return;

        con.query("insert into chatlog (id, timesent, channel, userid, display_name, color, message) values (?, ?, ?, ?, ?, ?, ?);", [
            tags.id,
            tags["tmi-sent-ts"],
            channel,
            tags["user-id"],
            tags["display-name"],
            tags["color"],
            message
        ]);

        if (isBanned(channel, tags["user-id"])) {
            console.log("Changing ban active state of " + tags["display-name"]);

            con.query("update ban set active = false where channel = ? and userid = ?;", [
                channel,
                tags["user-id"]
            ]);

            bannedList = bannedList.filter(brow => brow.channel !== channel && brow.userid !== tags["user-id"]);
        }

        if (isTimedOut(channel, tags["user-id"])) {
            console.log("Changing timeout active state of " + tags["display-name"]);

            con.query("update timeout set active = false where channel = ? and userid = ?;", [
                channel,
                tags["user-id"]
            ]);

            timeoutList = timeoutList.filter(torow => torow.channel !== channel && torow.userid !== tags["user-id"]);
        }
    } catch (e) {
        console.error(e);
    }
});

client.on("messagedeleted", (channel, username, deletedMessage, userstate) => {
    let id = userstate["target-msg-id"];

    con.query("update chatlog set deleted = true where id = ?;", [id]);
});

client.on('ban', (channel, username, reason, userstate) => {
    addBan(channel, userstate["target-user-id"], username, reason, userstate["tmi-sent-ts"]);
});

client.on("timeout", (channel, username, reason, duration, userstate) => {
    addTimeout(channel, userstate["target-user-id"], username, reason, duration, userstate["tmi-sent-ts"]);
});

client.addChannel = name => {
    name = name.toLowerCase();
    if (!channels.includes(name) && !disallowed_channels.includes(name)) {
        channels = [
            ...channels,
            name
        ];
        client.join(name);
    }
};

let connected = false;
client.on("connected", () => {

    setTimeout(() => {
        if (connected) return;
        connected = true;

        discordClient.guilds.fetch(config.modsquad_discord).then(msg => {
            modSquadGuild = msg;

            channels = [];
        
            msg.roles.cache.each(role => {
                let name = role.name.toLowerCase();
        
                client.addChannel(name);
            });
        
        }).catch(console.error); 
    }, 5000); 

});

module.exports = client;
