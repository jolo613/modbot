const {MessageEmbed} = require("discord.js");

const command = {
    data: {
        name: 'lookup',
        description: 'Run a lookup on the entire TMS database following the requested parameters. Passing several parameters will act as an OR request.',
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
                description: "Searches based on a Discord Name, can include discriminator (ie. Twijn#8888) or just a name (ie. Twijn)",
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
    execute(interaction, args) {
        const embed = new MessageEmbed()
                .setTitle("Welcome to Twitch Mod Squad!")
                .setDescription(`Get access to TMS channels by authenticating your account with twitch [here](https://tmsqd.co/discord).`)
                .setColor(0x772ce8);

        console.log(args);

        interaction.reply({content: ' ', embeds: [embed], ephemeral: true});
    }
};

module.exports = command;