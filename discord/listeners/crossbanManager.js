const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const Discord = require("discord.js");
const api = require("../../api/index");
const config = require("../../config.json");
const con = require("../../database");

let crossbanable = [];
api.Twitch.getUserById(config.twitch.id, false, true).then(tmsUser => {
    tmsUser.refreshStreamers().then(streamers => {
        streamers.forEach(streamer => {
            crossbanable = [
                ...crossbanable,
                streamer.id
            ];
        });
    }).catch(console.error);
}).catch(console.error);

const refreshToken = refresh_token => {
    return new Promise(async (resolve, reject) => {
        const oauthResult = await fetch("https://id.twitch.tv/oauth2/token", {
            method: 'POST',
            body: new URLSearchParams({
                client_id: config.twitch.client_id,
                client_secret: config.twitch.client_secret,
                refresh_token: refresh_token,
                grant_type: "refresh_token",
            }),
        });
    
        oauthResult.json().then(resolve, reject);
    });
}

const addBan = (broadcaster_id, moderator_id, access_token, user_id, reason) => {
    return new Promise(async (resolve, reject) => {
        const oauthResult = await fetch(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${encodeURIComponent(broadcaster_id)}&moderator_id=${encodeURIComponent(moderator_id)}`, {
            method: 'POST',
            headers: {
                Authorization: "Bearer " + access_token,
                "Client-Id": config.twitch.client_id,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({data:{user_id: user_id, reason: reason}}),
        });
    
        oauthResult.json().then(resolve, reject);
    });
}

let storedCrossBanChannels = [];
let storedCrossBanUser = [];

const listener = {
    name: 'crossbanManager',
    eventName: 'interactionCreate',
    eventType: 'on',
    async listener (interaction) {
        const handleSuccess = message => {
            interaction.reply({content: ' ', embeds: [new Discord.MessageEmbed().setTitle(message).setColor(0x2dad3e)], ephemeral: true})
        }

        const handleError = (err, method = "reply") => {
            console.error(err);
            interaction[method]({content: ' ', embeds: [new Discord.MessageEmbed().setTitle("Uh oh!").setDescription(err).setColor(0x9e392f)], ephemeral: true})
        }

        if (interaction.isButton() && interaction.component.customId.startsWith("cb-")) {
            let twitchId = interaction.component.customId.substring(3);

            api.Discord.getUserById(interaction.member.id, false, true).then(user => {
                if (user.identity?.id) {
                    api.getFullIdentity(user.identity.id).then(async identity => {
                        let options = [];
                        
                        for (let i = 0; i < identity.twitchAccounts.length; i++) {
                            let refreshToken;
                            try {
                                refreshToken = (await con.pquery("select refresh_token from twitch__user where id = ?;", [identity.twitchAccounts[i].id]))?.[0]?.refresh_token;
                                storedCrossBanUser[interaction.member.id] = identity.twitchAccounts[i];
                            } catch(err) {
                                console.error(err);
                            }

                            let streamers = await identity.twitchAccounts[i].getStreamers();
                            for (let s = 0; s < streamers.length; s++) {
                                if (refreshToken || crossbanable.indexOf(streamers[s].id) !== -1) {
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
                (interaction.component.customId.startsWith("cbauth-") ||
                interaction.component.customId.startsWith("cbperm-")) &&
                storedCrossBanChannels.hasOwnProperty(interaction.member.id)) {
            await interaction.deferReply({ ephemeral: true });

            let crossBanChannels = storedCrossBanChannels[interaction.member.id];
            let twitchId = interaction.component.customId.substring(7);

            let user;

            let userClient = false;
            let banClient = global.client.ban;

            let modId;
            let accessToken;

            try {
                user = await api.Twitch.getUserById(twitchId, false, true);

                if (storedCrossBanUser[interaction.member.id]) {
                    let modUser = storedCrossBanUser[interaction.member.id];
                    let refresh_token = (await con.pquery("select refresh_token from twitch__user where id = ?;", [modUser.id]))?.[0]?.refresh_token;

                    const oauthData = await refreshToken(refresh_token);

                    if (oauthData?.access_token) {
                        userClient = true;
                        modId = modUser.id;
                        accessToken = oauthData.access_token;
                    }
                }
            } catch (err) {
                handleError(err, "editReply");
                return;
            }

            let successes = "";
            let errors = "";

            for (let i = 0; i < crossBanChannels.length; i++) {
                let channel = crossBanChannels[i];
                try {
                    channel = await api.Twitch.getUserById(channel, false, true);
                    let url = "tms.to/t/" + user.id;

                    if (interaction.component.customId.startsWith("cb-perm")) {
                        // TODO: Put something here
                    }

                    if (userClient) {
                        let result = await addBan(channel.id, modId, accessToken, user.id, url);

                        if (result?.message) {
                            errors += `\n${channel?.display_name ? channel.display_name : channel}: ${result.message}`;
                            continue;
                        }
                    } else {
                        await global.client.ban.ban(channel.display_name.toLowerCase(), user.display_name.toLowerCase(), url);
                    }

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

            interaction.editReply({content: ' ', embeds: [embed], ephemeral: true})
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