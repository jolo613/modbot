const {MessageEmbed} = require("discord.js");
const config = require("../../config.json");
const api = require("../../api/index");
const FullIdentity = require("../../api/FullIdentity");
const DiscordGuild = require("../../api/Discord/DiscordGuild");

const errorEmbed = message => {
    return {content: ' ', embeds: [new MessageEmbed()
            .setTitle("Error:")
            .setDescription(message)
            .setColor(0xed3734)], ephemeral: true};
}

const command = {
    data: {
        name: 'register'
        , description: 'Register your Discord server to Twitch Mod Squad'
        , options: [
            {
                type: 6,
                name: "represents-discord",
                description: "Discord mention of the channel this Discord represents",
                required: true,
            },
            {
                type: 3,
                name: "represents-twitch",
                description: "Twitch name of the channel this Discord represents",
                required: true,
            },
        ]
    },
    execute(interaction) {
        if (interaction.member?.id === interaction.guild?.ownerId) {
            if (interaction.guild.id !== config.modsquad_discord || true) {
                console.log('get guild');
                api.Discord.getGuild(interaction.guild.id).then(() => {
                    interaction.reply(errorEmbed("This guild has already been registered!"));
                }).catch(async err => {
                    try {
                        console.log("get owner");
                        let ownerDiscord = await api.Discord.getUserById(interaction.guild.ownerId, false, true);
                        console.log(ownerDiscord);
                        let representsDiscord = await api.Discord.getUserById(interaction.options.getUser("represents-discord").id);
                        let representsTwitch = await api.Twitch.getUserByName(interaction.options.getString("represents-twitch"), true);
                        if (representsTwitch.length > 0) {
                            representsTwitch = representsTwitch[0];
                        } else {
                            interaction.reply(errorEmbed("Represents twitch user was not found!"));
                            return;
                        }
                        console.log(representsDiscord, representsTwitch)

                        let identity = null;
                        if (representsTwitch.identity?.id) identity = representsTwitch.identity;
                        if (representsDiscord.identity?.id) {
                            if (!(identity?.id) || identity.id == representsDiscord.identity.id) {
                                identity = representsDiscord.identity.id;
                            } else {
                                interaction.reply(errorEmbed("Represents twitch and discord user both exist with two separate identities...That doesn't work!"));
                                return;
                            }
                        }
                        console.log(identity);

                        if (identity?.id) {
                            identity = await api.getFullIdentity(identity.id);
                        } else {
                            identity = new FullIdentity(null, representsTwitch.display_name, false, [representsTwitch], [representsDiscord])
                        }

                        if (!identity.twitchAccounts.find(x => x.id = representsTwitch.id)) identity.twitchAccounts = [...identity.twitchAccounts, representsTwitch];
                        if (!identity.discordAccounts.find(x => x.id = representsDiscord.id)) identity.discordAccounts = [...identity.discordAccounts, representsDiscord];

                        console.log(identity);
                        let guild = new DiscordGuild(
                            interaction.guild.id,
                            identity,
                            ownerDiscord,
                            interaction.guild.name
                        );

                        guild.post().then(guild => {
                            interaction.reply({content: "Registered!", ephemeral: true})
                        }).catch(err => {
                            console.error(err);
                            interaction.reply(errorEmbed("An error occurred: " + err));
                        });
                    } catch(err) {
                        console.error(err);
                        interaction.reply(errorEmbed("An error occurred: " + err));
                    }
                });
            } else {
                interaction.reply(errorEmbed("This command can't be used in the Mod Squad discord!"));
            }
        } else {
            interaction.reply(errorEmbed("You are not the owner of this guild!"));
        }
    }
};

module.exports = command;