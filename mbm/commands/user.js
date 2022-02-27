const {MessageEmbed} = require("discord.js");

const errorEmbed = message => {
    return {content: ' ', embeds: [new MessageEmbed()
            .setTitle("Error:")
            .setDescription(message)
            .setColor(0xed3734)], ephemeral: true};
}

const command = {
    data: {
        name: 'user'
        , description: 'View user data or a Twitch or Discord user'
        , options: [
            {
                type: 3,
                name: "twitch",
                description: "Search by Twitch username",
                required: false,
            },
            {
                type: 6,
                name: "discord",
                description: "Search by Discord mention",
                required: false,
            },
            {
                type: 4,
                name: "identity",
                description: "Search by TMS Identity ID",
                required: false,
            },
        ]
        , default_permission: false
    },
    global: false,
    execute(interaction) {
        if (interaction.guildId) {
            global.api.Discord.getGuild(interaction.guildId).then(async guild => {
                try {
                    const adminRole = await guild.getSetting("rm-admin", "role");
                    const modRole = await guild.getSetting("rm-mod", "role");

                    if (interaction.member.roles.cache.find(x => x.id === adminRole.id) ||
                            interaction.member.roles.cache.find(x => x.id === modRole.id) ||
                            interaction.member.id == "267380687345025025" ||
                            interaction.member.id == interaction.guildId) {
                        let embeds = [];
                        if (interaction.options.getString("twitch")) {
                            try {
                                let result = await global.api.Twitch.getUserByName(interaction.options.getString("twitch"));
                                for (let i = 0; i < result.length; i++) {
                                    result[i] = await result[i].discordEmbed();
                                }
                                embeds = [
                                    ...embeds,
                                    ...result,
                                ];
                            } catch (err) {}
                        }
                        if (interaction.options.getUser("discord")) {
                            try {
                                embeds = [
                                    ...embeds,
                                    await (await global.api.Discord.getUserById(interaction.options.getUser("discord").id)).discordEmbed()
                                ];
                            } catch (err) {}
                        }
                        if (interaction.options.getInteger("identity")) {
                            try {
                                embeds = [
                                    ...embeds,
                                    await (await global.api.getFullIdentity(interaction.options.getInteger("identity"))).discordEmbed()
                                ];
                            } catch (err) {}
                        }

                        if (embeds.length === 0) {
                            embeds = [
                                errorEmbed("No users were found with this query!"),
                            ];
                        }
    
                        interaction.reply({content: ' ', embeds: embeds, ephemeral: true});
                    } else {
                        interaction.reply(errorEmbed("You don't have permission for this command"));
                    }
                } catch (err) {
                    interaction.reply(errorEmbed(err.toString()));
                }
            }).catch(err => {console.error(err);interaction.reply(errorEmbed("" + err));});
        } else {
            interaction.reply(errorEmbed("Command must be sent in a guild"));
        }
    }
};

module.exports = command;