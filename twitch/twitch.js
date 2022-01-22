const CLIENT_CONNECT_TIMEOUT = 5000;
const CLIENT_MAXIMUM_CHANNELS = 20;

const ACTIVE_CHANNEL_PADDING = 3;

const config = require("../config.json");

const api = require("../api/index");

const tmi = require('tmi.js');
const con = require("../database");

const discordClient = require("../discord/discord");

const {MessageEmbed} = require("discord.js");

let clients = [];

let modSquadGuild = null;

let channels = [];
let disallowed_channels = ["ludwig", "tarzaned"];

let bannedList = [];
let timeoutList = [];

let bannedPerMinute = {};

setInterval(() => {
    for (const [streamer, timestampList] of Object.entries(bannedPerMinute)) {
        let now = Date.now();
        bannedPerMinute[streamer] = timestampList.filter(ts => now - ts < 60000);
    }
}, 1000);

con.query("select * from twitch__ban where active = true;", (err, res) => {
    if (err) {
        console.error(err);
        return;
    }

    res.forEach(log => {
        bannedList = [
            ...bannedList,
            {
                streamer_id: log.streamer_id,
                user_id: log.user_id,
            }
        ]
    });

    console.log("Loaded " + bannedList.length + " bans");
});

con.query("select * from twitch__timeout where active = true;", (err, res) => {
    if (err) {
        console.error(err);
        return;
    }

    res.forEach(log => {
        timeoutList = [
            ...timeoutList,
            {
                streamer_id: log.streamer_id,
                user_id: log.user_id,
            }
        ]
    });

    console.log("Loaded " + timeoutList.length + " t/o's");
});

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
const addBan = async (channel, userid, username, reason, timebanned) => {
    let channelStripped = channel.replace("#", "");

    let streamer = (await api.Twitch.getUserByName(channelStripped, true))[0];
    let streamer_id = streamer.id;

    let speaker = (await api.Twitch.getUserByName(username, true))[0];

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

                dchnl.send({content: ' ', embeds: [embed]});
            }
        }

        partFromChannel(channelStripped);

        setTimeout(() => {
            listenOnChannel(channelStripped);
        }, 15 * 60 * 1000);

        return;
    }

    if (bannedPerMinute[channel].length <= 30) {
        con.query("insert into twitch__ban (timebanned, streamer_id, user_id) values (?, ?, ?);", [
            timebanned,
            streamer_id,
            userid
        ]);

        bannedList = [
            ...bannedList,
            {
                streamer_id: streamer_id,
                user_id: userid,
            }
        ]
    } else {
        console.log(`Not logging ban in ${channel} due to exceeding BPM threshold (${bannedPerMinute[channel].length}>30)`);
    }

    // send ban message, if the liveban channel is present.

    if (bannedPerMinute[channel].length <= 5) {
        if (config.hasOwnProperty("liveban_channel")) {
            let dchnl = modSquadGuild.channels.cache.find(dchnl => dchnl.id == config.liveban_channel);

            if (dchnl.isText()) {
                con.query("select twitch__user.display_name, message, deleted, timesent from twitch__chat join twitch__user on twitch__user.id = twitch__chat.user_id where streamer_id = ? and user_id = ? order by timesent desc limit 10;",[
                    streamer_id,
                    userid
                ], async (err, res) => {
                    const embed = new MessageEmbed()
                            .setTitle(`User was Banned!`)
                            .setURL(speaker.getShortlink())
                            .setAuthor(streamer.display_name, streamer.profile_image_url, "https://twitch.tv/" + channelStripped)
                            .setDescription(`User \`${username}\` was banned from channel \`${channel}\``)
                            .setColor(0xe83b3b)
                            .setFooter("Bans per Minute: " + bannedPerMinute[channel].length);

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

                    const lares = await con.pquery("select streamer.display_name as channel, max(timesent) as lastactive from twitch__chat join twitch__user as streamer on twitch__chat.streamer_id = streamer.id where user_id = ? group by streamer.display_name;", [userid]);

                    let bannedChannels = [];

                    // grab banned channels from the database
                    try {
                        let gbcRes = await con.pquery("select distinct tu.display_name as channel from twitch__ban as tb join twitch__user as tu on tb.streamer_id = tu.id where tb.user_id = ? and active = true;", [userid]);

                        gbcRes.forEach(bc => {
                            bannedChannels = [
                                ...bannedChannels,
                                bc.channel
                            ];
                        });
                    } catch (err) {
                        console.error(err);
                    }

                    let longestChannelName = 7;
                    let activeChannels = "";

                    // calculate longest channel name
                    lares.forEach(xchnl => {
                        if (xchnl.channel.length > longestChannelName) longestChannelName = xchnl.channel.length;
                    });

                    bannedChannels.forEach(chnl => {
                        if (chnl.length > longestChannelName) longestChannelName = chnl.length;
                    });

                    // assemble active channels
                    lares.forEach(xchnl => {
                        activeChannels += "\n" + xchnl.channel + (' '.repeat(Math.max(1, longestChannelName + ACTIVE_CHANNEL_PADDING - xchnl.channel.length))) + parseDate(parseInt(xchnl.lastactive)) + (bannedChannels.includes(xchnl.channel) || xchnl.channel === channel ? ' [❌ banned]' : '');

                        bannedChannels.splice(bannedChannels.indexOf(xchnl.channel), 1);
                    });

                    // assemble "also banned in" section
                    if (bannedChannels.length > 0) {
                        activeChannels += "\nAlso banned in:";
                    }

                    bannedChannels.forEach(chnl => {
                        activeChannels += "\n" + chnl + (' '.repeat(Math.max(1, longestChannelName + ACTIVE_CHANNEL_PADDING - chnl.length))) + "Never Active" + (' '.repeat(12)) + '[❌ banned]';
                    });

                    // add the field, if any active channels were found (which should pretty much always be true)

                    if (activeChannels !== "")
                        embed.addField(`Active in Channels:`, `\`\`\`\nChannel${' '.repeat(longestChannelName + ACTIVE_CHANNEL_PADDING - 7)}Last Active${activeChannels}\`\`\``);

                    // embed.addField("Crossban", "Click the `❌` reaction on this message to ban this user in the channels you're mod on.", true);
                    
                    dchnl.send({content: ' ', embeds: [embed]}).then(message => {
                        con.query("update twitch__ban set discord_message = ? where timebanned = ? and streamer_id = ? and user_id = ?;", [
                            message.id,
                            timebanned,
                            streamer_id,
                            userid
                        ]);

                        // message.react('❌');
                    }).catch(console.error);
                });
            }
        }
    } else {
        console.log(`Not notifying of ban in ${channel} due to exceeding BPM threshold (${bannedPerMinute[channel]}>5)`);
    }
}

const addTimeout = async (channel, userid, username, reason, duration, timeto) => {
    let streamer = (await api.Twitch.getUserByName(channel.replace("#", ""), true))[0];
    let user = (await api.Twitch.getUserByName(username, true))[0];

    con.query("insert into twitch__timeout (streamer_id, user_id, timeto, duration) values (?, ?, ?, ?);", [
        streamer.id,
        userid,
        timeto,
        duration,
    ]);

    timeoutList = [
        ...timeoutList,
        {
            streamer_id: streamer.id,
            user_id: userid,
        }
    ];
}

const isBanned = async (channel, userid) => {
    let streamer = (await api.Twitch.getUserByName(channel.replace("#",""), true))[0];
    return bannedList.find(bannedRow => bannedRow.streamer_id === streamer.id && bannedRow.user_id === userid) !== undefined;
}

const isTimedOut = async (channel, userid) => {
    let streamer = (await api.Twitch.getUserByName(channel.replace("#",""), true))[0];
    return timeoutList.find(timeoutRow => timeoutRow.streamer_id === streamer.id && timeoutRow.user_id === userid) !== undefined;
}

const handle = {
    message: async (channel, tags, message, self) => {
        try {
            // Ignore echoed messages.
            if (self) return;
    
            if (tags.hasOwnProperty("message-type") && tags["message-type"] === "whisper") return;

            let streamer = (await api.Twitch.getUserByName(channel.replace("#", ""), true))[0];
            let user = (await api.Twitch.getUserByName(tags.username, true))[0];
    
            con.query("insert into twitch__chat (id, streamer_id, user_id, message, color, timesent) values (?, ?, ?, ?, ?, ?);", [
                tags.id,
                streamer.id,
                user.id,
                message,
                tags["color"],
                tags["tmi-sent-ts"],
            ], err => {
                if (err) console.error(err);
            });
    
            if (await isBanned(channel, tags["user-id"])) {
                console.log("Changing ban active state of " + tags["display-name"]);
    
                con.query("update twitch__ban set active = false where streamer_id = ? and user_id = ?;", [
                    streamer.id,
                    tags["user-id"]
                ]);
    
                bannedList = bannedList.filter(brow => brow.streamer_id !== streamer.id && brow.userid !== tags["user-id"]);
            }
    
            if (await isTimedOut(channel, tags["user-id"])) {
                console.log("Changing timeout active state of " + tags["display-name"]);
    
                con.query("update twitch__timeout set active = false where streamer_id = ? and user_id = ?;", [
                    streamer.id,
                    tags["user-id"]
                ]);
    
                timeoutList = timeoutList.filter(torow => torow.streamer_id !== streamer.id && torow.user_id !== tags["user-id"]);
            }
        } catch (e) {
            console.error(e);
        }
    },
    messageDeleted: (channel, username, deletedMessage, userstate) => {
        let id = userstate["target-msg-id"];
    
        con.query("update twitch__chat set deleted = true where id = ?;", [id]);
    },
    ban: (channel, username, reason, userstate) => {
        addBan(channel, userstate["target-user-id"], username, reason, userstate["tmi-sent-ts"]);
    },
    timeout: (channel, username, reason, duration, userstate) => {
        addTimeout(channel, userstate["target-user-id"], username, reason, duration, userstate["tmi-sent-ts"]);
    },
};

con.query("select streamer_id, user_id from twitch__ban where active = true;", (err, res) => {
    if (err) {console.error(err);return;}

    res.forEach(ban => {
        bannedList = [
            ...bannedList,
            {
                streamer_id: ban.streamer_id,
                user_id: ban.user_id,
            }
        ]
    });
});

con.query("select streamer_id, user_id from twitch__timeout where active = true;", (err, res) => {
    if (err) {console.error(err);return;}

    res.forEach(timeout => {
        timeoutList = [
            ...timeoutList,
            {
                streamer_id: timeout.streamer_id,
                user_id: timeout.user_id,
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
        options: { debug: false },
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
        status: "initializing",
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

                clientObj.status = "initialized";
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

const getChannelCount = () => {
    let total = 0;
    clients.forEach(client => {
        total += client.channels.length;
    })
    return total;
}

const updateActivity = () => {
    let channelCount = getChannelCount();
    let nodeCount = clients.length;
    if (global?.client?.discord?.user)
        global.client.discord.user.setActivity(`${channelCount} channel${channelCount === 1 ? "" : "s"} with ${nodeCount} node${nodeCount === 1 ? "" : "s"}`, {type: "WATCHING"})
}

setInterval(updateActivity, 30000);
setTimeout(updateActivity, 3000);


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
});

con.query("select distinct lower(twitch__user.display_name) as name from identity__moderator join identity on modfor_id = identity.id join twitch__user on twitch__user.identity_id = identity.id where identity__moderator.active = true;", (err, res) => {
    if (err) {console.error(err);return;}

    res.forEach(streamer => {
        listenOnChannel(streamer.name);
    });

    setTimeout(() => {
        console.log("Startup completed!");
    }, (clients.length * CLIENT_CONNECT_TIMEOUT) + 500);
});

const banClient = new tmi.Client({
    options: { debug: false },
    connection: { reconnect: true },
    identity: {
        username: config.twitch.username,
        password: config.twitch.oauth
    },
});

banClient.connect();

global.listenOnChannel = listenOnChannel;

module.exports = {
    listenOnChannel: listenOnChannel,
    banClient: banClient,
    getClients: function() {return clients;},
};
