const {MessageEmbed, MessageButton, MessageActionRow} = require("discord.js");
const {Modal, TextInputComponent, showModal} = require("discord-modals");
const api = require("../../api/index");
const con = require("../../database");

const config = require("../../config.json");

const command = {
    cache: {},
    data: {
        name: 'archive'
        , description: 'Create or edit Archive submissions!'
        , options: [
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
            }
        ]
    },
    execute(interaction) {
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
        }
    }
};

module.exports = command;