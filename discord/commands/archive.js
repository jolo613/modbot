const {MessageEmbed} = require("discord.js");
const {Modal, TextInputComponent, showModal} = require("discord-modals");
const api = require("../../api/index");
const con = require("../../database");

const config = require("../../config.json");

const command = {
    cache: {},
    temporaryMessage (obj, method, message, timeout = 5000, description = null) {
        const embed = new MessageEmbed()
            .setTitle(message)
            .setFooter({text: `Information message. This message will expire in ${(timeout/1000)} second${timeout === 1000 ? "" : "s"}.`, iconURL: "https://twitchmodsquad.com/assets/images/logo.webp"});

        if (description !== null) embed.setDescription(description);

        obj[method]({content: ' ', embeds: [embed]}).then(messObj => {
            setTimeout(() => {
                if (method === "reply") {
                    obj.deleteReply();
                } else {
                    messObj.delete();
                }
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
            },
            {
                type: 1,
                name: "delete",
                description: "Delete an Archive submission",
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
                                .setMaxLength(1024)
                                .setPlaceholder("Go into more detail!")
                                .setRequired(true)
                        );

                    showModal(modal, {
                        client: global.client.discord,
                        interaction: interaction,
                    })
                } else {
                    interaction.error({content: "Your account isn't properly linked to TMS. Contact <@267380687345025025>", ephemeral: true});
                }
            }, error => {
                interaction.error(error);
            });
        } else if (subcommand === "edit") {
            interaction.error("Not yet implemented!");
        } else if (subcommand === "delete") {
            interaction.error("Not yet implemented!");
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
                const messageEntries = await con.pquery("select archive_id from archive__messages where id = ? or archive_id = ?;", [query, query]);
                add(messageEntries);
            } catch (e) {
                console.error(e);
            }
            
            let embeds = [];

            for (let i = 0; i < entries.length; i++) {
                try {
                    let entry = await api.Archive.getEntryById(entries[i]);
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
                        .setDescription("This users record is squeaky clean!\n\nFor more detailed user information, try searching for this user with the /user command.")
                        .setColor(0x36b55c)
                ]
            }

            interaction.reply({content: ' ', embeds: embeds, ephemeral: true});
        }
    }
};

module.exports = command;