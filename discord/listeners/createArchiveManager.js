const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const {MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu, Message} = require("discord.js");
const { type } = require("express/lib/response");
const api = require("../../api/index");
const con = require("../../database");
const fs = require("fs");

const mime = require("mime-types");

const DIRECTORY = "./files/";

try {
fs.mkdirSync(DIRECTORY);
} catch (e) {}

const downloadFile = (archiveId, contentType, result, remote_path = null) => {
    let name = api.stringGenerator(32) + (mime.extension(contentType) ? "." + mime.extension(contentType) : "");
    con.query("insert into archive__create_files (archive_id, content_type, local_path, remote_path) values (?, ?, ?, ?);", [archiveId, contentType, name, remote_path]);
    result.body.pipe(fs.createWriteStream(DIRECTORY + name));
}

const DOWNLOADABLE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const listener = {
    name: 'createArchiveManager',
    eventName: 'messageCreate',
    eventType: 'on',
    textUserCache: {},
    delayMessage: (object, func, message, timeout) => {
        if (typeof(message) === "string") {
            const embed = new MessageEmbed()
                .setTitle(message);
            message = {embeds: [embed]};
        }

        if (message.embeds.length > 0 && message.embeds.hasOwnProperty(0)) {
            message.embeds[0].setFooter({text: "Information message. This message will expire in " + Math.round(timeout/100)/10 + " second" + (timeout === 1000 ? "" : "s") + "."});
        }
        object[func](message).then(message => {
            setTimeout(() => {
                try {
                    if (func === "reply") {
                        object.deleteReply().then(() => {}, console.error);
                    } else
                        message.delete().then(() => {}, console.error);
                } catch (e) {
                    console.error(e);
                }
            }, timeout);
        });
    },
    steps: [
        {
            prompt: "Continue searching for Twitch users, or continue to the next step!",
            startStep: (embed) => {
                embed.setDescription("Select any **Twitch** accounts to link with this report.")
                return {error: false, embed: embed};
            },
            captureChat: async (message) => {
                let queries = message.content.replace(/(?:%|_|\\)/g, '\\$&').split('\n');
                let twitchUsers = [];

                try {
                    for (let q = 0; q < queries.length; q++) {
                        let query = queries[q];

                        if (query.length === 0) continue;
                        
                        let users = await con.pquery("select id from twitch__user where display_name like ? or id = ? limit 5;", [query + "%", query]);

                        for (let i = 0;i < users.length; i++) {
                            twitchUsers = [
                                ...twitchUsers,
                                await api.Twitch.getUserById(users[i].id),
                            ];
                        }
                    }

                    for (let q = 0; q < queries.length; q++) {
                        let query = queries[q];

                        if (query.length === 0) continue;

                        let users = await api.Twitch.getUserByName(query, true);

                        for (let u = 0; u < users.length; u++) {
                            if (twitchUsers.find(x => x.id === users[u].id)) continue;
                            twitchUsers = [
                                ...twitchUsers,
                                users[u],
                            ];
                        }
                    }
                } catch (err) {
                    console.error(err);
                }

                twitchUsers.forEach(async twitchUser => {
                    let id = "t-" + twitchUser.id;

                    if (twitchUser.identity?.id) id = "i-" + twitchUser.identity.id;

                    const addButton = new MessageButton()
                        .setLabel("Add User")
                        .setCustomId("sbs-" + id)
                        .setStyle("SUCCESS");
                    
                    const dismissButton = new MessageButton()
                        .setLabel("Dismiss")
                        .setCustomId("sbs-dismiss")
                        .setStyle("DANGER");

                    const row = new MessageActionRow()
                        .addComponents(addButton, dismissButton);
                    
                    message.channel.send({content: ' ', embeds: [await twitchUser.discordEmbed()], components: [row]});
                });
            },
            disablePrev: (archiveEntry, twitchUsers, discordUsers) => {
                return true;
            },
            disableNext: (archiveEntry, twitchUsers, discordUsers) => {
                return false;
            },
        },
        {
            prompt: "Continue searching for Discord users, or continue to the next step!",
            startStep: (embed) => {
                embed.setDescription("Select any **Discord** accounts to link with this report.")
                return {error: false, embed: embed};
            },
            captureChat: async (message) => {
                let queries = message.content.replace(/(?:%|_|\\)/g, '\\$&').split('\n');
                let discordUsers = [];

                try {
                    for (let q = 0; q < queries.length; q++) {
                        let query = queries[q];

                        if (query.length === 0) continue;
                        
                        let users = await con.pquery("select id from discord__user where name like ? or id = ? limit 5;", [query + "%", query]);

                        for (let i = 0;i < users.length; i++) {
                            discordUsers = [
                                ...discordUsers,
                                await api.Discord.getUserById(users[i].id),
                            ];
                        }
                    }

                    for (let q = 0; q < queries.length; q++) {
                        let query = queries[q];

                        if (query.length === 0) continue;

                        let users = await api.Discord.getUserById(query, false, true);

                        for (let u = 0; u < users.length; u++) {
                            if (twitchUsers.find(x => x.id === users[u].id)) continue;
                            twitchUsers = [
                                ...twitchUsers,
                                users[u],
                            ];
                        }
                    }
                } catch (err) {
                    console.error(err);
                }

                discordUsers.forEach(async discordUser => {
                    let id = "d-" + discordUser.id;

                    if (discordUser.identity?.id) id = "i-" + discordUser.identity.id;

                    const addButton = new MessageButton()
                        .setLabel("Add User")
                        .setCustomId("sbs-" + id)
                        .setStyle("SUCCESS");
                    
                    const dismissButton = new MessageButton()
                        .setLabel("Dismiss")
                        .setCustomId("sbs-dismiss")
                        .setStyle("DANGER");

                    const row = new MessageActionRow()
                        .addComponents(addButton, dismissButton);
                    
                    message.channel.send({content: ' ', embeds: [await discordUser.discordEmbed()], components: [row]});
                });

                if (discordUsers.length === 0) {
                    let users = "";
                    
                    let str = api.stringGenerator(16);

                    while (listener.textUserCache.hasOwnProperty(str)) {
                        str = api.stringGenerator(16);
                    }

                    queries.forEach(query => {
                        users += "\n" + query;
                    });

                    listener.textUserCache[str] = queries;

                    const embed = new MessageEmbed()
                            .setTitle("No users found!")
                            .addDescription("Add the users ```"+ users +"``` anyway? This will **not** create a link to existing users, and therefore means that this report may not be searched without including this user string exactly.");

                    const addButton = new MessageButton()
                        .setLabel("Add User Anyway")
                        .setCustomId("sbs-nf-d-" + str)
                        .setStyle("SUCCESS");
                    
                    const dismissButton = new MessageButton()
                        .setLabel("Dismiss")
                        .setCustomId("sbs-dismiss")
                        .setStyle("DANGER");

                    const row = new MessageActionRow()
                        .addComponents(addButton, dismissButton);
                    message.channel.send({content: ' ', embeds: [embed], components: [row]});
                }
            },
            disablePrev: (archiveEntry, twitchUsers, discordUsers) => {
                return false;
            },
            disableNext: (archiveEntry, twitchUsers, discordUsers) => {
                return !(twitchUsers.length > 0 || discordUsers.length > 0);
            },
        },
        {
            prompt: "In as few words as possible, what did this user do? (For example: harrassment, unsolicited pictures, etc.)",
            startStep: (embed, archiveEntry, twitchUsers, discordUsers) => {
                let error = false;
                if (twitchUsers.length > 0 || discordUsers.length > 0) {
                    embed.setDescription("Saved! Now, in as few words as possible, what did this user do? (For example: harrassment, unsolicited pictures, etc.)");
                } else {
                    error = true;
                    embed.setDescription("Unable to continue! You must have at least 1 Discord account or 1 Twitch account selected.");
                }
                return {error: error, embed: embed};
            },
            captureChat: async (message) => {
                if (message.content.length > 4 && message.content.length <= 256) {
                    con.query("update archive__create set offense = ? where thread_id = ?;", [message.content, message.channel.id], err => {
                        if (err) {
                            console.error(err);
                            message.reply("An error occurred!");
                            return;
                        }
                        listener.parse(message.channel);
                    });
                } else {
                    message.reply("Message content length out of bounds! Must be greater than 4 and less than or equal to 256 characters.");
                }
            },
            disablePrev: (archiveEntry, twitchUsers, discordUsers) => {
                return false;
            },
            disableNext: (archiveEntry, twitchUsers, discordUsers) => {
                return archiveEntry.offense == undefined || archiveEntry.offense == null;
            },
        },
        {
            prompt: "Explain in more detail what the user did. (Don't include links)",
            startStep: (embed, archiveEntry, twitchUsers, discordUsers) => {
                let error = false;
                if (archiveEntry.offense != undefined && archiveEntry.offense != null) {
                    embed.setDescription("Great! Now, explain in more detail what this user did (Don't include links to evidence).");
                } else {
                    error = true;
                    embed.setDescription("Unable to continue! You must specify an offense.");
                }
                return {error: error, embed: embed};
            },
            captureChat: async (message) => {
                if (message.content.length > 20 && message.content.length <= 1024) {
                    con.query("update archive__create set description = ? where thread_id = ?;", [message.content, message.channel.id], err => {
                        if (err) {
                            console.error(err);
                            message.reply("An error occurred!");
                            return;
                        }
                        listener.parse(message.channel);
                    });
                } else {
                    listener.delayMessage(message.channel, "send", "Message content length out of bounds! Must be greater than 20 and less than or equal to 1024 characters.", 5000);
                }
            },
            disablePrev: (archiveEntry, twitchUsers, discordUsers) => {
                return false;
            },
            disableNext: (archiveEntry, twitchUsers, discordUsers) => {
                return archiveEntry.description == undefined || archiveEntry.description == null;
            },
        },
        {
            prompt: "Include any links to images or other documents to attach to this document. Note: You can also upload photos to Discord!",
            startStep: (embed, archiveEntry, twitchUsers, discordUsers) => {
                let error = false;
                if (archiveEntry.description != undefined && archiveEntry.description != null) {
                    embed.setDescription("Now, include any links to images or other documents to attach to this document. Note: You can also upload photos to Discord!");
                } else {
                    error = true;
                    embed.setDescription("Unable to continue! You must specify a description.");
                }
                return {error: error, embed: embed};
            },
            captureChat: async (message) => {
                if (message.attachments.size > 0) {
                    message.attachments.each(async attachment => {
                        const result = await fetch(attachment.url);

                        let type = result.headers.get("Content-Type").toLowerCase();

                        downloadFile(message.channel.id, type, result, attachment.name);
                    });
                } else {
                    try {
                        let url = new URL(message.content);

                        if (url.protocol !== "http:" && url.protocol !== "https:") throw "Invalid protocol";

                        const result = await fetch(url);

                        let type = result.headers.get("Content-Type").toLowerCase();

                        if (DOWNLOADABLE_TYPES.includes(type)) {
                            downloadFile(message.channel.id, type, result, message.content);
                        } else {
                            con.query("insert into archive__create_files (archive_id, remote_path, content_type) values (?, ?, ?);", [message.channel.id, message.content, type], (err) => {
                                if (err) {
                                    listener.delayMessage(message.channel, "send", "Insertion failed: " + err, 5000);
                                }

                                listener.parse(message.channel);
                            });
                        }
                    } catch (err) {
                        listener.delayMessage(message.channel, "send", "Message should either contain an attachment or a URL message content", 5000);
                    }
                }
            },
            disablePrev: (archiveEntry, twitchUsers, discordUsers) => {
                return false;
            },
            disableNext: (archiveEntry, twitchUsers, discordUsers) => {
                return false;
            },
        },
        {
            prompt: "Confirm the information below!",
            startStep: (embed, archiveEntry, twitchUsers, discordUsers) => {
                embed.setDescription("Confirm the information above!");
                return {error: false, embed: embed};
            },
            captureChat: async (message) => {
                // nothing to do here...
            },
            disablePrev: (archiveEntry, twitchUsers, discordUsers) => {
                return false;
            },
            disableNext: (archiveEntry, twitchUsers, discordUsers) => {
                return false;
            },
        },
        {
            prompt: "",
            startStep: (embed, archiveEntry, twitchUsers, discordUsers) => {
                
                return {error: false, embed: embed};
            },
            captureChat: async (message) => {
                // nothing to do here...
            },
            disablePrev: (archiveEntry, twitchUsers, discordUsers) => {
                return false;
            },
            disableNext: (archiveEntry, twitchUsers, discordUsers) => {
                return false;
            },
        },
    ],
    getTextUserCache() {
        return listener.textUserCache;
    },
    async getThreadData (thread) {

        const archiveEntry = (await con.pquery("select * from archive__create where thread_id = ?;", [thread.id]))[0];
        const starterMessage = await thread.messages.fetch(archiveEntry.message_id);

        let twitchUsers = [];
        let discordUsers = [];

        const users = await con.pquery("select * from archive__create_users where archive_id = ?;", [thread.id]);

        for (let u = 0; u < users.length; u++) {
            let user = users[u];

            if (user.type === "identity") {
                let identity = await api.getFullIdentity(user.value);
                if (identity) {
                    twitchUsers = [
                        ...twitchUsers,
                        ...identity.twitchAccounts,
                    ];
                    discordUsers = [
                        ...discordUsers,
                        ...identity.discordAccounts,
                    ];
                }
            } else if (user.type === "twitch") {
                if (user.user) {
                    twitchUsers = [
                        ...twitchUsers,
                        await api.Twitch.getUserById(user.value),
                    ]
                } else {
                    twitchUsers = [
                        ...twitchUsers,
                        user.value,
                    ]
                }
            } else if (user.type === "discord") {
                if (user.user) {
                    discordUsers = [
                        ...discordUsers,
                        await api.Discord.getUserById(user.value),
                    ]
                } else {
                    discordUsers = [
                        ...discordUsers,
                        user.value,
                    ]
                }
            }
        }

        const files = await con.pquery("select * from archive__create_files where archive_id = ?;", [thread.id]);

        return {archiveEntry: archiveEntry, starterMessage: starterMessage, twitchUsers: twitchUsers, discordUsers: discordUsers, files: files}
    },
    async parse (thread) {
        const {archiveEntry, starterMessage, twitchUsers, discordUsers, files} = await listener.getThreadData(thread);

        if (!archiveEntry || !starterMessage) {
            listener.delayMessage(thread, "send", "This thread is broken. I'm lost. Call Dev, we need help!", 10000);
        }

        const embed = new MessageEmbed()
            .setTitle("Serious Ban Archive Entry")
            .setColor(0xa970ff);


        let stepData = listener.steps[archiveEntry.step - 1];
            
        embed.setDescription(`Step ${archiveEntry.step}/6:\n\n` + stepData.prompt);


        if (twitchUsers.length > 0) {
            let str = "";
            twitchUsers.forEach(user => {
                str += "\n" + user.display_name;
            });
            embed.addField("Twitch Users", "```" + str + "```", true);
        }

        if (discordUsers.length > 0) {
            let str = "";
            discordUsers.forEach(user => {
                str += "\n" + user.name + "#" + user.discriminator;
            });
            embed.addField("Discord Users", "```" + str + "```", true);
        }

        if (archiveEntry.offense) {
            embed.addField("Offense", archiveEntry.offense, false);
        }

        if (archiveEntry.description) {
            embed.addField("Description", "```" + archiveEntry.description + "```", false);
        }

        if (files.length > 0 && archiveEntry.step > 5) {
            let fileStr = "";
            files.forEach(file => {
                fileStr += "\n" + ((file.name ? file.name : "Unnamed") + ": " + (file.local_path ? file.local_path : file.remote_path));
            });
            embed.addField("Files", "```" + fileStr + "```", false);
        }

        const prevStep = new MessageButton()
            .setLabel("Previous Step")
            .setCustomId("sbs-prev")
            .setStyle("SECONDARY");

        const nextStep = new MessageButton()
            .setLabel("Next Step")
            .setCustomId("sbs-next")
            .setStyle("PRIMARY");

        if (archiveEntry.step === 6) nextStep.setLabel("Submit").setStyle("SUCCESS");

        if (stepData.disablePrev(archiveEntry, twitchUsers, discordUsers)) prevStep.setDisabled(true);
        if (stepData.disableNext(archiveEntry, twitchUsers, discordUsers)) nextStep.setDisabled(true);

        const row = new MessageActionRow()
                .addComponents(prevStep, nextStep);

        let components = [row];

        if (files.length > 0) {
            const fileSelectMenu = new MessageSelectMenu()
                .setCustomId("file-name")
                .setMinValues(1)
                .setMaxValues(1)
                .setPlaceholder("Select a file to rename it!");

            files.forEach(file => {
                fileSelectMenu.addOptions({
                    label: (file.name ? file.name : (file.local_path ? file.local_path : (file.remote_path ? file.remote_path : file.id))),
                    value: "" + file.id,
                    description: (file.remote_path ? file.remote_path : file.local_path),
                })
            });

            const fileEdit = new MessageActionRow().addComponents(fileSelectMenu);
            components = [fileEdit, ...components];
        }

        starterMessage.edit({content: ' ', embeds: [embed], components: components});
    },
    listener (message) {
        if (message.channel.isThread() && !message.author.bot) {
            con.query("select * from archive__create where thread_id = ?;", [message.channel.id], async (err, res) => {
                if (err) {
                    console.error(err);
                    return;
                }

                if (res.length === 0) return;
                let thread = res[0];

                if (listener.steps.hasOwnProperty(thread.step-1)) {
                    listener.steps[thread.step-1].captureChat(message);
                } else {
                    listener.delayMessage(message.channel, "send", "Unknown step", 3000);
                }

                message.delete();
            });
        }
    }
};

module.exports = listener;