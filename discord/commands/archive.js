const {MessageEmbed} = require("discord.js");
const {Modal, TextInputComponent, showModal} = require("discord-modals");
const api = require("../../api/index");
const con = require("../../database");

const config = require("../../config.json");

let moveChoices = config.channels.archive_sort_targets.map(x => {
    return {
        name: x.label,
        value: x.value,
    };
});

const vd = () => {};

const command = {
    cache: {},
    temporaryMessage (obj, method, message, timeout = 5000, description = null) {
        const embed = new MessageEmbed()
            .setTitle(message)
            .setFooter({text: `Information message. This message will expire in ${(timeout/1000)} second${timeout === 1000 ? "" : "s"}.`, iconURL: "https://twitchmodsquad.com/assets/images/logo.webp"});

        if (description !== null) embed.setDescription(description);

        obj[method]({content: ' ', embeds: [embed]}).then(messObj => {
            setTimeout(() => {
                try {
                    if (method === "reply") {
                        obj.deleteReply().then(vd, vd);
                    } else {
                        messObj.delete().then(vd, vd);
                    }
                } catch (e) {}
            }, timeout);
        }, console.error);
    },
    data: {
        name: 'archive'
        , description: 'Create or edit Archive submissions!'
        , options: [
            {
                type: 1,
                name: "search",
                description: "Search for a user in the Archive database",
                options: [
                    {
                        type: 3,
                        name: "query",
                        description: "Search query. Twitch ID/Name or Discord ID/Name",
                        required: true,
                    }
                ],
            },
            {
                type: 1,
                name: "create",
                description: "Create a new Archive submission",
                options: [
                    {
                        type: 3,
                        name: "twitch-name-1",
                        description: "Add a Twitch username to this archive submission",
                        required: false,
                        autocomplete: true,
                    },
                    {
                        type: 3,
                        name: "twitch-name-2",
                        description: "Add a Twitch username to this archive submission",
                        required: false,
                        autocomplete: true,
                    },
                    {
                        type: 3,
                        name: "twitch-name-3",
                        description: "Add a Twitch username to this archive submission",
                        required: false,
                        autocomplete: true,
                    },
                    {
                        type: 3,
                        name: "twitch-name-4",
                        description: "Add a Twitch username to this archive submission",
                        required: false,
                        autocomplete: true,
                    },
                    {
                        type: 3,
                        name: "twitch-name-5",
                        description: "Add a Twitch username to this archive submission",
                        required: false,
                        autocomplete: true,
                    },
                    {
                        type: 3,
                        name: "discord-id-1",
                        description: "Add a Discord ID to this archive submission",
                        required: false,
                    },
                    {
                        type: 3,
                        name: "discord-id-2",
                        description: "Add a Discord ID to this archive submission",
                        required: false,
                    },
                    {
                        type: 3,
                        name: "discord-id-3",
                        description: "Add a Discord ID to this archive submission",
                        required: false,
                    },
                    {
                        type: 3,
                        name: "discord-id-4",
                        description: "Add a Discord ID to this archive submission",
                        required: false,
                    },
                    {
                        type: 3,
                        name: "discord-id-5",
                        description: "Add a Discord ID to this archive submission",
                        required: false,
                    },
                    {
                        type: 4,
                        name: "identity-id-1",
                        description: "Add an Identity ID to this archive submission",
                        required: false,
                    },
                    {
                        type: 4,
                        name: "identity-id-2",
                        description: "Add an Identity ID to this archive submission",
                        required: false,
                    },
                    {
                        type: 4,
                        name: "identity-id-3",
                        description: "Add an Identity ID to this archive submission",
                        required: false,
                    },
                    {
                        type: 4,
                        name: "identity-id-4",
                        description: "Add an Identity ID to this archive submission",
                        required: false,
                    },
                    {
                        type: 4,
                        name: "identity-id-5",
                        description: "Add an Identity ID to this archive submission",
                        required: false,
                    },
                ],
            },
            {
                type: 1,
                name: "edit",
                description: "Edit an Archive submission",
                options: [
                    {
                        type: 3,
                        name: "id",
                        description: "ID of the archive entry. 8 character string",
                        required: true,
                    }
                ],
            },
            {
                type: 1,
                name: "delete",
                description: "Delete an Archive submission. Must be your submission",
                options: [
                    {
                        type: 3,
                        name: "id",
                        description: "ID of the archive entry. 8 character string",
                        required: true,
                    }
                ],
            },
            {
                type: 1,
                name: "setowner",
                description: "Sets the owner of an Archive submission. Administrator only",
                options: [
                    {
                        type: 3,
                        name: "id",
                        description: "ID of the archive entry. 8 character string",
                        required: true,
                    },
                    {
                        type: 6,
                        name: "owner",
                        description: "The new owner for this Archive entry",
                        required: true,
                    },
                ],
            },
            {
                type: 1,
                name: "move",
                description: "Move an Archive submission. Administrator only",
                options: [
                    {
                        type: 3,
                        name: "id",
                        description: "ID of the archive entry. 8 character string",
                        required: true,
                    },
                    {
                        type: 3,
                        name: "channel",
                        description: "Channel to move the archive entry to",
                        required: true,
                        choices: moveChoices,
                    }
                ],
            },
        ]
    },
    async execute(interaction) {
        let subcommand = interaction.options.getSubcommand();

        if (subcommand === "create") {
            api.Discord.getUserById(interaction.member.id).then(user => {
                if (user.identity?.id) {
                    let twitch = [];
                    let discord = [];
                    let identity = [];

                    for (let i = 1; i < 6; i++) {
                        let twitchUser = interaction.options.getString("twitch-name-" + i);
                        if (twitchUser) twitch = [...twitch, twitchUser];

                        let discordUser = interaction.options.getString("discord-id-" + i);
                        if (discordUser) discord = [...discord, discordUser];

                        let identityId = interaction.options.getString("identity-id-" + i);
                        if (identityId) identity = [...identity, identityId];
                    }

                    command.cache[user.identity.id] = {
                        twitch: twitch,
                        discord: discord,
                        identity: identity,
                        channel: interaction.channel,
                    };

                    let modal = new Modal()
                        .setCustomId("archive-create")
                        .setTitle("Create an Archive Entry")
                        .addComponents(
                            new TextInputComponent()
                                .setCustomId("offense")
                                .setLabel("Offense")
                                .setStyle("SHORT")
                                .setMinLength(3)
                                .setMaxLength(256)
                                .setPlaceholder("Write something like 'Harrassment' or 'Unsolicted Pictures' (Note: Don't put links here!)")
                                .setRequired(true),
                            new TextInputComponent()
                                .setCustomId("description")
                                .setLabel("Description")
                                .setStyle("LONG")
                                .setMinLength(32)
                                .setMaxLength(2048)
                                .setPlaceholder("Go into more detail!")
                                .setRequired(true)
                        );

                    showModal(modal, {
                        client: global.client.discord,
                        interaction: interaction,
                    })
                } else {
                    interaction.error("Your account isn't properly linked to TMS. Contact <@267380687345025025>");
                }
            }, error => {
                interaction.error(error);
            });
        } else if (subcommand === "edit") {
            api.Discord.getUserById(interaction.member.id).then(user => {
                api.Archive.getEntryById(interaction.options.getString("id", true)).then(entry => {
                    if (interaction.level === 2 || entry.owner.id === user.identity?.id) {
                        entry.openEdit(interaction.member).then(message => {
                            interaction.success("Edit menu is opened! [View it here](" + message.url + ")")
                        }, err => {
                            interaction.error("Error: " + err);
                        });
                    } else {
                        interaction.error("**You don't have permission!**\nYou must be an administrator to use this command.");
                    }
                }, error => {
                    interaction.error(error);
                });
            }, error => {
                interaction.error(error);
            });
        } else if (subcommand === "setowner") {
            if (interaction.level === 2) {
                let newOwner = interaction.options.getUser("owner", true);
                api.Discord.getUserById(interaction.member.id).then(curUser => {
                    api.Archive.getEntryById(interaction.options.getString("id", true)).then(entry => {
                        api.Discord.getUserById(newOwner.id).then(user => {
                            if (user.identity?.id) {
                                entry.setOwner(user.identity, curUser.identity);
                                interaction.success(`New owner has been set!\nNew owner: \`#${user.identity.id} ${user.identity.name}\` <@${user.id}>`);
                            } else {
                                interaction.error("Target user is not properly authenticated to TMS.");
                            }
                        }, error => {
                            interaction.error("Target user is not properly linked to TMS.");
                        })
                    }, error => {
                        interaction.error("Error: " + error);
                    });
                }, error => {
                    interaction.error("You are not properly linked to TMS.");
                });
            } else {
                interaction.error("**You don't have permission!**\nYou must be an administrator to use this command.");
            }
        } else if (subcommand === "move") {
            if (interaction.level === 2) {
                api.Discord.getUserById(interaction.member.id).then(user => {
                    if (user.identity?.id) {
                        api.Archive.getEntryById(interaction.options.getString("id", true)).then(entry => {
                            api.getFullIdentity(user.identity.id).then(identity => {
                                global.client.discord.channels.fetch(interaction.options.getString("channel", true)).then(channel => {
                                    entry.move(channel, identity);
                                    interaction.success("Entry was successfully moved!");
                                }, error => {
                                    interaction.error("Unable to get target channel");
                                });
                            }, error => {
                                interaction.error(error);
                            })
                        }, error => {
                            interaction.error(error);
                        });
                    } else {
                        interaction.error("You're not properly linked to TMS. That's a you problem");
                    }
                }, error => {
                    interaction.error(error);
                });
            } else {
                interaction.error("**You don't have permission!**\nYou must be an administrator to use this command.");
            }
        } else if (subcommand === "delete") {
            api.Discord.getUserById(interaction.member.id).then(user => {
                api.Archive.getEntryById(interaction.options.getString("id", true)).then(entry => {
                    if (interaction.level === 2 || entry.owner.id === user.identity?.id) {
                        entry.delete(user.identity);
                        interaction.success("Archive entry was successfully deleted!");
                    } else {
                        interaction.error("**You don't have permission!**\nYou must be an administrator to use this command.");
                    }
                }, error => {
                    interaction.error(error);
                });
            }, error => {
                interaction.error(error);
            });
        } else if (subcommand === "search") {
            let query = interaction.options.getString("query", true);

            let entries = [];

            const add = newEntries => {
                newEntries.forEach(entry => {
                    if (!entries.includes(entry))
                        entries = [
                            ...entries,
                            entry.archive_id,
                        ];
                });
            }

            try {
                const twitchEntries = await con.pquery("select archive__users.archive_id from twitch__username join archive__users on archive__users.value = twitch__username.id where twitch__username.id = ? or twitch__username.display_name = ?;", [query, query]);
                add(twitchEntries);
            } catch(e) {
                console.error(e);
            }

            try {
                const discordEntries = await con.pquery("select archive__users.archive_id from discord__user join archive__users on archive__users.value = discord__user.id where discord__user.id = ? or discord__user.name = ?;", [query, query]);
                add(discordEntries);
            } catch(e) {
                console.error(e);
            }

            try {
                let split = query.split("#");
                if (split.length === 2) {
                    const userValueEntries = await con.pquery("select archive__users.archive_id from discord__user join archive__users on archive__users.value = discord__user.id where discord__user.name = ? and discord__user.discriminator = ?;", [split[0], split[1]]);
                    add(userValueEntries);
                }
            } catch(e) {
                console.error(e);
            }

            try {
                const userValueEntries = await con.pquery("select archive_id from archive__users where value = ?;", [query]);
                add(userValueEntries);
            } catch(e) {
                console.error(e);
            }

            try {
                const messageEntries = await con.pquery("select archive_id from archive__messages where id = ? or archive_id = ?;", [query, query]);
                add(messageEntries);
            } catch (e) {
                console.error(e);
            }
            
            let embeds = [];

            for (let i = 0; i < entries.length; i++) {
                try {
                    let entry = await api.Archive.getEntryById(entries[i]);
                    console.log(entry);
                    embeds = [
                        ...embeds,
                        await entry.discordEmbed(),
                    ];
                } catch (e) {
                    console.error(e);
                }
            }

            if (embeds.length === 0) {
                embeds = [
                    new MessageEmbed()
                        .setTitle("No records found!")
                        .setDescription("No archive entries were found with the query: `" + query + "`")
                        .setFooter({text: "For more detailed user information, try searching for this user with the /user command.", iconURL: "https://twitchmodsquad.com/assets/images/logo.webp"})
                        .setColor(0x36b55c)
                ]
            }

            if (interaction.channel.id === config.channels.archive_name_checker) {
                interaction.reply({content: ' ', embeds: embeds}).then(async() => {
                    if (entries.length === 1) {
                        const message = await interaction.fetchReply();
                        con.query("insert into archive__messages (id, guild_id, channel_id, archive_id, reason) values (?, ?, ?, ?, 'query');", [message.id, message.guild.id, message.channel.id, entries[0]], err => {
                            if (err) console.error(err);
                        });
                    }
                });
            } else {
                interaction.reply({content: ' ', embeds: embeds, ephemeral: true});
            }
        }
    }
};

module.exports = command;