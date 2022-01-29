const Discord = require("discord.js");
const api = require("../../api/index");
const config = require("../../config.json");

let crossbanable = [];
api.Twitch.getUserById(config.twitch.id).then(tmsUser => {
    tmsUser.refreshStreamers().then(streamers => {
        streamers.forEach(streamer => {
            crossbanable = [
                ...crossbanable,
                streamer.id
            ];
        });
    }).catch(console.error);
}).catch(console.error);

let storedCrossBanChannels = [];

const listener = {
    name: 'crossbanManager',
    eventName: 'interactionCreate',
    eventType: 'on',
    async listener (interaction) {
        const handleSuccess = message => {
            interaction.reply({content: ' ', embeds: [new Discord.MessageEmbed().setTitle(message).setColor(0x2dad3e)], ephemeral: true})
        }

        const handleError = err => {
            console.error(err);
            interaction.reply({content: ' ', embeds: [new Discord.MessageEmbed().setTitle("Uh oh!").setDescription(err).setColor(0x9e392f)], ephemeral: true})
        }

        if (interaction.isButton() && interaction.component.customId.startsWith("cb-")) {
            let twitchId = interaction.component.customId.substring(3);

            api.Discord.getUserById(interaction.member.id, false, true).then(user => {
                if (user.identity?.id) {
                    api.getFullIdentity(user.identity.id).then(async identity => {
                        let options = [];
                        
                        for (let i = 0; i < identity.twitchAccounts.length; i++) {
                            let streamers = await identity.twitchAccounts[i].getStreamers();
                            for (let s = 0; s < streamers.length; s++) {
                                if (crossbanable.indexOf(streamers[s].id) !== -1) {
                                    options = [
                                        ...options,
                                        {
                                            value: streamers[s].id + "",
                                            label: streamers[s].display_name,
                                        }
                                    ];
                                }
                            }
                        }

                        if (options.length > 0) {
                            const selectMenu = new Discord.MessageSelectMenu()
                                .setCustomId("cbsel-" + twitchId)
                                .addOptions(options)
                                .setPlaceholder("Select streamer channels to carry out the crossban on.")
                                .setMinValues(1)
                                .setMaxValues(options.length);

                            const row = new Discord.MessageActionRow()
                                    .addComponents(selectMenu);

                            const embed = new Discord.MessageEmbed()
                                    .setTitle("Select the streamers you'd like to crossban for.")
                                    .setColor(0xe83b3b)
                                    .setDescription("This list is a list of users you mod for that have TwitchModSquad authenticated. It may take several hours for a channel to show up if it recently met these requirements.");

                            interaction.reply({content: ' ', embeds: [embed], components: [row], ephemeral: true});
                        } else {
                            handleError("No streamers you mod for have TwitchModSquad added as a moderator.");
                        }
                    }).catch(err => handleError(err + ""));
                } else {
                    handleError("You must link your account with TMS before you can use Crossban functions!\nAsk a user for an invite link.");
                }
            }).catch(handleError);
        } else if (interaction.isButton() &&
                storedCrossBanChannels[interaction.member.id] &&
                (interaction.component.customId.startsWith("cbauth-") ||
                interaction.component.customId.startsWith("cbperm-"))) {
            
            let crossBanChannels = storedCrossBanChannels[interaction.member.id];
            let twitchId = interaction.component.customId.substring(7);

            let user;

            try {
                user = await api.Twitch.getUserById(twitchId);
            } catch (err) {
                handleError(err);
                return;
            }

            let successes = "";
            let errors = "";

            for (let i = 0; i < crossBanChannels.length; i++) {
                let channel = crossBanChannels[i];
                try {
                    channel = await api.Twitch.getUserById(channel);
                    let url = "tms.to/t/" + user.id;

                    if (interaction.component.customId.startsWith("cb-perm")) {
                        // TODO: Put something here
                    }

                    await global.client.ban.ban(channel.display_name.toLowerCase(), user.display_name.toLowerCase(), url);

                    successes += `\n${channel.display_name}`;
                } catch(err) {
                    errors += `\n${channel?.display_name ? channel.display_name : channel}: ${err}`;
                }
            }

            let embed = new Discord.MessageEmbed()
                    .setTitle("Crossban Results")
                    .setDescription("Do not forget to dismiss the crossban messages!")
                    .setColor(0x4aab37);

            if (successes !== "") {
                embed.addField("Successful Bans", "```" + successes + "```", true);
            }
            if (errors !== "") {
                embed.addField("Unsuccessful Bans", "```" + errors + "```", true);
            }

            interaction.reply({content: ' ', embeds: [embed], ephemeral: true})
        } else if (interaction.isSelectMenu() && interaction.component.customId.startsWith("cbsel-")) {
            let twitchId = interaction.component.customId.substring(6);
            storedCrossBanChannels[interaction.member.id] = interaction.values;

            const authButton = new Discord.MessageButton()
                    .setCustomId("cbauth-" + twitchId)
                    .setLabel("Ban with Authentication Link")
                    .setStyle("PRIMARY");

            const permButton = new Discord.MessageButton()
                    .setCustomId("cbperm-" + twitchId)
                    .setLabel("Ban with Permanent Link [not yet implemented]")
                    .setStyle("SUCCESS")
                    .setDisabled(true);
            
            const row = new Discord.MessageActionRow()
                    .addComponents(authButton, permButton);

            const embed = new Discord.MessageEmbed()
                    .setTitle("Select a Ban Option")
                    .setDescription(`You selected ${interaction.values.length} channel${interaction.values.length === 1 ? "" : "s"} to cross ban! Select an option below to complete the crossban.`)
                    .addField("Ban with Authentication Link", "Ban the user with a link reason that requires authentication to view. The link will look like `tms.to/t/176442256`", true)
                    .addField("Ban with Permanent Link", "Ban the user with a permanent link that does not require authentication to view. The link will look like `tms.to/QRGSNjRz`", true);

            interaction.reply({content: ' ', embeds: [embed], components: [row], ephemeral: true});
        }
    }
};

module.exports = listener;