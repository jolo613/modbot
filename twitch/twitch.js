const CLIENT_CONNECT_TIMEOUT = 15000;
const CLIENT_MAXIMUM_CHANNELS = 20;

const ACTIVE_CHANNEL_PADDING = 3;

const config = require("../config.json");

const tmi = require('tmi.js');
const con = require("../database");

const discordClient = require("../discord/discord");

const {MessageEmbed} = require("discord.js");
const client = require("../discord/discord");

let clients = [];

let modSquadGuild = null;

let channels = [];
let disallowed_channels = ["@everyone", "admin", "server booster", "modbot", "ludwig", "tarzaned"];

let bannedList = [];
let timeoutList = [];

let bannedPerMinute = {};

setInterval(() => {
    for (const [streamer, timestampList] of Object.entries(bannedPerMinute)) {
        let now = Date.now();
        bannedPerMinute[streamer] = timestampList.filter(ts => now - ts < 60000);
    }
}, 1000);

function parseDay(day) {
    let result = "";

    switch (day) {
        case 0:
            result = "Sun";
            break;
        case 1:
            result = "Mon";
            break;
        case 2:
            result = "Tue";
            break;
        case 3:
            result = "Wed";
            break;
        case 4:
            result = "Thu";
            break;
        case 5:
            result = "Fri";
            break;
        case 6:
            result = "Sat";
    }

    return result;
}

function parseDate(timestamp) {
    let dte = new Date(timestamp);

    let hr = "" + dte.getHours();
    let mn = "" + dte.getMinutes();
    let sc = "" + dte.getSeconds();

    if (hr.length === 1) hr = "0" + hr;
    if (mn.length === 1) mn = "0" + mn;
    if (sc.length === 1) sc = "0" + sc;

    let mo = "" + (dte.getMonth() + 1);
    let dy = "" + dte.getDate();
    let yr = dte.getFullYear();

    if (mo.length === 1) mo = "0" + mo;
    if (dy.length === 1) dy = "0" + dy;

    return `${parseDay(dte.getDay())} ${mo}.${dy}.${yr} ${hr}:${mn}:${sc}`;
}

/* I think reason may be deprecated here, so it may always be null. I'll have to check on that. */
const addBan = (channel, userid, username, reason, timebanned) => {
    let channelStripped = channel.replace("#", "");
    if (!bannedPerMinute.hasOwnProperty(channel)) {
        bannedPerMinute[channel] = [];
    }
    bannedPerMinute[channel] = [
        ...bannedPerMinute[channel],
        Date.now()
    ];

    if (bannedPerMinute[channel].length > 60) {
        console.log("More than 60 bans per minute in " + channel + ". Parting for 15 minutes.");

        if (bannedPerMinute[channel].length === 61 && config.hasOwnProperty("liveban_channel")) {
            let dchnl = modSquadGuild.channels.cache.find(dchnl => dchnl.id == config.liveban_channel);

            if (dchnl.isText()) {
                const embed = new MessageEmbed()
                        // Set the title of the field
                        .setTitle(`Bot Action Detected`)
                        // Set the description of the field
                        .setDescription(`Channel \`${channel}\` appears to be handling a bot attack. Channel has had \`${bannedPerMinute[channel].length}\` bans in the last minute, this exceeds the limit of \`60\`.\nThe bot will part from the channel for \`15 minutes\`.`)
                        // Set the color of the embed
                        .setColor(0x8c1212);

                dchnl.send(embed);
            }
        }

        partFromChannel(channelStripped);

        setTimeout(() => {
            listenOnChannel(channelStripped);
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
                            .setTitle(`User was Banned!`)
                            .setAuthor(channelStripped, undefined, "https://twitch.tv/" + channelStripped)
                            .setDescription(`User \`${username}\` was banned from channel \`${channel}\``)
                            .setColor(0xe83b3b)
                            .setFooter("Bans per Minute: " + bannedPerMinute[channel].length);

                    con.query("select display_name, profile_image_url from userinfo where login = ?;", [channel.replace('#', "")], (uierr, uires) => {
                        if (!uierr && typeof(uires) === "object") {
                            if (uires.length === 1) {
                                embed.setAuthor(uires[0].display_name, uires[0].profile_image_url, "https://twitch.tv/" + channelStripped);
                            }
                        }

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
    
                                logs += `\n${hor}:${min}:${sec} [${log.display_name}]: ${log.message}${log.deleted == 1 ? " [❌ deleted]" : ""}`;
                            });
    
                            if (logs == "") logs = "There are no logs in this channel from this user!";
    
                            embed.addField(`Chat Log in \`${channel}\``, "```" + logs + "```", false);
                        }

                        con.query("select channel, max(timesent) as lastactive from chatlog where userid = ? group by channel;", [userid], (laerr, lares) => {
                            if (!laerr && typeof(uires) === "object") {
                                let activeChannels = "";

                                let longestChannelName = 7;

                                lares.forEach(xchnl => {
                                    if (xchnl.length > longestChannelName) longestChannelName = xchnl.length;
                                });

                                lares.forEach(xchnl => {
                                    activeChannels += "\n" + xchnl.channel + ' '.repeat(longestChannelName + ACTIVE_CHANNEL_PADDING - xchnl.channel.length) + parseDate(parseInt(xchnl.lastactive));
                                });

                                if (activeChannels !== "")
                                    embed.addField(`Active in Channels:`, `\`\`\`\nChannel${' '.repeat(longestChannelName + ACTIVE_CHANNEL_PADDING - 7)}Last Active${activeChannels}\`\`\``);
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

const handle = {
    message: (channel, tags, message, self) => {
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
    },
    messageDeleted: (channel, username, deletedMessage, userstate) => {
        let id = userstate["target-msg-id"];
    
        con.query("update chatlog set deleted = true where id = ?;", [id]);
    },
    ban: (channel, username, reason, userstate) => {
        addBan(channel, userstate["target-user-id"], username, reason, userstate["tmi-sent-ts"]);
    },
    timeout: (channel, username, reason, duration, userstate) => {
        addTimeout(channel, userstate["target-user-id"], username, reason, duration, userstate["tmi-sent-ts"]);
    }
};

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

const isChannelListenedTo = channel => {
    for (let client of clients) {
        if (client.channels.includes(channel)) {
            return true;
        }
    }
    return false;
}

const initializeClient = () => {
    const client = new tmi.Client({
        options: { debug: true },
        connection: { reconnect: true },
        identity: {
            username: config.twitch.username,
            password: config.twitch.oauth
        },
    });

    client.on('message', handle.message);

    client.on("messagedeleted", handle.messageDeleted);

    client.on('ban', handle.ban);
    
    client.on("timeout", handle.timeout);

    let clientObj = {
        client: client,
        channels: []
    };

    clientObj.addChannel = name => {
        name = name.toLowerCase();
        if (!isChannelListenedTo(name) && !disallowed_channels.includes(name)) {
            clientObj.channels = [
                ...clientObj.channels,
                name
            ];
        }
    };

    clients = [
        ...clients,
        clientObj
    ];

    let delay = clients.filter(client => client.client.readyState() === "CLOSED").length * CLIENT_CONNECT_TIMEOUT;

    console.log(`Initializing new client with delay of ${delay}`);

    setTimeout(() => {
        console.log("Initializing client...");
        client.connect();

        const interval = setInterval(() => {
            if (client.readyState() === "OPEN") {
                console.log("Client opened. Connecting clients.");
                clearInterval(interval);

                clientObj.addChannel = name => {
                    name = name.toLowerCase();
                    if (!isChannelListenedTo(name) && !disallowed_channels.includes(name)) {
                        clientObj.channels = [
                            ...clientObj.channels,
                            name
                        ];
                        client.join(name);
                    }
                };
        
                clientObj.channels.forEach(channel => {
                    client.join(channel).catch(console.error);
                });
            }
        }, 1000);
        
    }, delay);

    return clientObj;
}

const getFreeClient = () => {
    for (let client of clients) {
        if (client.channels.length < CLIENT_MAXIMUM_CHANNELS) {
            return client;
        }
    }

    return initializeClient();
}

const listenOnChannel = channel => {
    getFreeClient().addChannel(channel);
}

const partFromChannel = channel => {
    channel = channel.replace('#', "");
    for (let client of channels) {
        if (client.channels.includes(channel)) {
            console.log("Parting channel " + channel);
            client.client.part(channel);
            client.channels.splice(client.channels.indexOf(channel), 1);
        }
    }
}


discordClient.guilds.fetch(config.modsquad_discord).then(msg => {
    modSquadGuild = msg;

    msg.roles.cache.each(role => {
        let name = role.name.toLowerCase();

        listenOnChannel(name);
    });

}).catch(console.error);

module.exports = {listenOnChannel: listenOnChannel};
