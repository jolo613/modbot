const {MessageEmbed} = require("discord.js");
const API = require("../../api");
const IdentityService = new API.IdentityService();

const command = {
    data: {
        name: "lookup",
        description: "Run a lookup on the entire TMS database following the requested parameters.",
        options: [
            {
                name: "discord-id",
                description: "Searches based on a Discord ID",
                type: 3,
                required: false,
            },
            {
                name: "twitch-id",
                description: "Searches based on a Twitch ID",
                type: 3,
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
            IdentityService.resolveByDiscordId(interaction.options.getInteger("discord-id")).then(identity => {
                console.log(identity);
                interaction.reply({content: identity.toString(), ephemeral: true});
            }).catch(err => {
                const embed = new MessageEmbed()
                    .setTitle("Error!")
                    .setDescription(`Error: ${err}`)
                    .setColor(0xed3734);
    
                interaction.reply({content: ' ', embeds: [embed], ephemeral: true});
            });
        } else {
            const embed = new MessageEmbed()
                .setTitle("Invalid Usage!")
                .setDescription(`You must provide at least one parameter for us to search properly.`)
                .setColor(0xed3734);

            interaction.reply({content: ' ', embeds: [embed], ephemeral: true});
        }
    }
};

module.exports = command;