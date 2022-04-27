const Discord = require("discord.js");
const api = require("../../api/index");
const config = require("../../config.json");
const con = require("../../database");

const DISMISS_TIMEOUT = 5;

const {parse, getThreadData, getTextUserCache, delayMessage, steps} = require("./createArchiveManager");

const listener = {
    name: 'createArchiveInteractionManager',
    eventName: 'interactionCreate',
    eventType: 'on',
    async listener (interaction) {
        if (interaction.channel.isThread() && interaction.isButton() && interaction.component.customId.startsWith("sbs-")) {
            const {archiveEntry, starterMessage, twitchUsers, discordUsers} = await getThreadData(interaction.channel);
            
            if (interaction.component.customId === "sbs-dismiss") {
                interaction.message.delete();
            } else if (interaction.component.customId === "sbs-next" || interaction.component.customId === "sbs-prev") {
                let next = interaction.component.customId === "sbs-next";

                let error = false;
                let embed = new Discord.MessageEmbed()
                        .setTitle((next ? "Next" : "Previous") + " step!")
                        .setColor(0xa970ff);

                let nextStep = archiveEntry.step + (next ? 1 : -1);

                if (nextStep === 0) {
                    embed.setDescription("This is the first step.");
                    error = true;
                } else if (steps.hasOwnProperty(nextStep - 1)) {
                    let startStep = steps[nextStep - 1].startStep(embed, archiveEntry, twitchUsers, discordUsers);
                    error = startStep.error;
                    embed = startStep.embed;
                } else {
                    delayMessage(interaction, "reply", "Unknown step!", DISMISS_TIMEOUT * 1000);
                    return;
                }

                if (embed) {
                    embed.setFooter({text: "Information message. This message will expire in " + DISMISS_TIMEOUT + " second" + (DISMISS_TIMEOUT === 1 ? "" : "s") + "."})
                    interaction.reply({content: ' ', embeds: [embed]});
                    setTimeout(() => {
                        interaction.deleteReply();
                    }, DISMISS_TIMEOUT * 1000);
                }

                if (!error) {
                    con.query("update archive__create set step = step + ? where thread_id = ?;", [next ? 1 : -1, interaction.channel.id], err => {
                        if (err) console.error(err);
                        parse(interaction.channel);
                    });
                }
            } else

            if (interaction.component.customId.startsWith("sbs-i-")) {
                let identityId = interaction.component.customId.replace("sbs-i-", "");

                con.query("insert into archive__create_users (archive_id, type, value) values (?, 'identity', ?);", [interaction.channel.id, identityId], (err) => {
                    if (err) {
                        console.error(err);
                        interaction.reply(err);
                    } else {
                        parse(interaction.channel);
                        interaction.message.delete();
                    }
                });
            } else if (interaction.component.customId.startsWith("sbs-t-")) {
                let twitchId = interaction.component.customId.replace("sbs-t-", "");

                con.query("insert into archive__create_users (archive_id, type, value) values (?, 'twitch', ?);", [interaction.channel.id, twitchId], (err) => {
                    if (err) {
                        console.error(err);
                        interaction.reply(err);
                    } else {
                        parse(interaction.channel);
                        interaction.message.delete();
                    }
                });
            } else if (interaction.component.customId.startsWith("sbs-d-")) {
                let discordId = interaction.component.customId.replace("sbs-d-", "");

                con.query("insert into archive__create_users (archive_id, type, value) values (?, 'discord', ?);", [interaction.channel.id, discordId], (err) => {
                    if (err) {
                        console.error(err);
                        interaction.reply(err);
                    } else {
                        parse(interaction.channel);
                        interaction.message.delete();
                    }
                });
            } else

            if (interaction.component.customId.startsWith("sbs-nf-d-")) {
                const cache = getTextUserCache();
                let customId = interaction.component.customId.replace("sbs-nf-d-", "");

                if (cache.hasOwnProperty(customId)) {
                    console.log(cache[customId]);
                } else {
                    console.log("undefined");
                }
            }
        }
    }
};

module.exports = listener;