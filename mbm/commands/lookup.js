const {MessageEmbed} = require("discord.js");

const command = {
    data: {
        name: "lookup",
        description: "Run a lookup on the entire TMS database following the requested parameters.",
        options: [
            {
                name: "discord-id",
                description: "Searches based on a Discord ID",
                type: 4,
                required: false,
            },
            {
                name: "twitch-id",
                description: "Searches based on a Twitch ID",
                type: 4,
                required: false,
            },
            {
                name: "discord-name",
                description: "Searches based on a Discord Name, can include discriminator(ie.Twijn#8888) or just a name(ie.Twijn)",
                type: 3,
                required: false,
            },
            {
                name: "twitch-name",
                description: "Searches based on a Twitch Name",
                type: 3,
                required: false,
            },
            {
                name: "modfor-twitch-id",
                description: "Searches based on who moderates for a specific Twitch ID",
                type: 3,
                required: false,
            },
            {
                name: "modfor-twitch-name",
                description: "Searches based on who moderates for a specific Twitch Name",
                type: 3,
                required: false,
            },
        ]
    },
    execute(interaction) {
        if (interaction.options.getInteger("discord-id")) {
            console.log(interaction.options.getInteger("discord-id"));
        } else {
            console.log("/shrug");
        }
        interaction.reply("Hi");
    }
};

module.exports = command;