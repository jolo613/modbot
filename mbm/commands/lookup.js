const {MessageEmbed} = require("discord.js");
const {IdentityService} = require("../../api");

const resolveIdentity = (interaction, identity) => {

}

const resolveLookup = (interaction, identities) => {
    if (identities.length === 1) {
        resolveIdentity(interaction, identities[0]);
    }
}

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
        if (interaction.options.getString("discord-id")) {
            IdentityService.resolveByDiscordId(interaction.options.getString("discord-id")).then(identity => {
                resolveIdentity(interaction, identity);
            }).catch(err => {
                const embed = new MessageEmbed()
                    .setTitle("Error!")
                    .setDescription(`Error: ${err}`)
                    .setColor(0xed3734);
    
                interaction.reply({content: ' ', embeds: [embed], ephemeral: true});
            });
        } else if (interaction.options.getString("discord-name")) {
            let str = interaction.options.getString("discord-name").split("#");
            
            if (str.length === 1) {

            } else if (str.length === 2) {
            } else {
                const embed = new MessageEmbed()
                    .setTitle("Improper format!")
                    .setDescription(`Improper discord name format, should either contain only a name\`Twijn\`, or a name and discriminator, \`Twijn#8888\`. Make sure you don't have any outlying \`#\` characters.`)
                    .setColor(0xed3734);
    
                interaction.reply({content: ' ', embeds: [embed], ephemeral: true});
            }
        } else if (interaction.options.getString("twitch-id")) {
            IdentityService.resolveByTwitchId(interaction.options.getString("twitch-id")).then(identity => {
                resolveIdentity(interaction, identity);
            }).catch(err => {
                const embed = new MessageEmbed()
                    .setTitle("Error!")
                    .setDescription(`Error: ${err}`)
                    .setColor(0xed3734);
    
                interaction.reply({content: ' ', embeds: [embed], ephemeral: true});
            });
        } else if (interaction.options.getString("twitch-name")) {

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