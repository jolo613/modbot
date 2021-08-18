const {MessageEmbed} = require("discord.js");
const {IdentityService} = require("../../api");

const resolveLookup = (interaction, identity) => {
    let embedList = [];

    let authorizedStreamers = "";

    identity.streamers.forEach(streamer => {
        authorizedStreamers += "\n" + streamer.name;
    });

    embedList = [
        ...embedList,
        new MessageEmbed()
                .setTitle(identity.name)
                .setDescription(`\`\`\`\n${identity.profiles.twitch.length} twitch profile${identity.profiles.twitch.length === 1 ? "" : "s"}\n${identity.profiles.discord.length} discord profile${identity.profiles.discord.length === 1 ? "" : "s"}\`\`\``)
                .setThumbnail(identity.avatar_url)
                .setColor(0x157ee8)
                .addField("Authorized Streamers", "```" + authorizedStreamers + "```")
    ];

    identity.profiles.twitch.forEach(twitchAcc => {
        embedList = [
            ...embedList,
            new MessageEmbed()
                    .setTitle("Twitch: " + twitchAcc.display_name)
                    .setDescription(twitchAcc.description)
                    .setThumbnail(twitchAcc.profile_image_url)
                    .setColor(0x157ee8)
        ]
    });

    interaction.reply({content: ' ', embeds: embedList, ephemeral: true});
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
                resolveLookup(interaction, identity);
            }).catch(err => {
                const embed = new MessageEmbed()
                    .setTitle("Error!")
                    .setDescription(`Error: ${err}`)
                    .setColor(0xed3734);
    
                interaction.reply({content: ' ', embeds: [embed], ephemeral: true});
            });
        } else if (interaction.options.getString("discord-name")) {

        } else if (interaction.options.getString("twitch-id")) {
            IdentityService.resolveByTwitchId(interaction.options.getString("twitch-id")).then(identity => {
                resolveLookup(interaction, identity);
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