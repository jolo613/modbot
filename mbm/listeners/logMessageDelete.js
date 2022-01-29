const { MessageEmbed } = require("discord.js");
const {Discord} = require("../../api/index");
const con = require("../../database");

const listener = {
    name: 'logMessageDelete',
    eventName: 'messageDelete',
    eventType: 'on',
    listener (message) {
        if (message.guildId) {
            Discord.getGuild(message.guildId).then(guild => {
                Discord.getUserById(message.author.id, false, true).then(user => {
                    con.query("insert into discord__edit (guild_id, channel_id, message_id, user_id, old_message, new_message) values (?, ?, ?, ?, ?, null);", [
                        guild.id,
                        message.channel.id,
                        message.id,
                        user.id,
                        message.content
                    ], err => {
                        if (err) {
                            console.error(err);
                        }
                    });
                }).catch(err => {
                    console.error(err);
                });

                if (!message.author.bot) {
                    guild.getSetting("lde-enabled", "boolean").then(enabled => {
                        if (enabled) {
                            guild.getSetting("lde-channel", "channel").then(async channel => {
                                let author = message.author;
                                channel.send({content: ' ', embeds: [new MessageEmbed()
                                        .setTitle("Message Deleted")
                                        .setDescription(`A message was deleted in ${message.channel}, created by ${message.author}`)
                                        .addField("Message Content", "```\n" + message.content.replace(/`/g, "/`") + "```", false)
                                        .setColor(0x4c80d4)
                                        .setAuthor({name: author.username, iconURL: author.avatarURL()})]});
                            }).catch(console.error);
                        }
                    }).catch(console.error);
                }
            }).catch(console.error);
        }
    }
};

module.exports = listener;