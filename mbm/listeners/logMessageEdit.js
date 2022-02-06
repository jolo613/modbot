const { MessageEmbed } = require("discord.js");
const {Discord} = require("../../api/index");
const con = require("../../database");

const listener = {
    name: 'logMessageEdit',
    eventName: 'messageUpdate',
    eventType: 'on',
    listener (oldMessage, newMessage) {
        if (oldMessage.guildId && oldMessage.content !== newMessage.content) {
            Discord.getGuild(oldMessage.guildId).then(guild => {
                Discord.getUserById(oldMessage.author.id, false, true).then(user => {
                    con.query("insert into discord__edit (guild_id, channel_id, message_id, user_id, old_message, new_message) values (?, ?, ?, ?, ?, ?);", [
                        guild.id,
                        oldMessage.channel.id,
                        oldMessage.id,
                        user.id,
                        oldMessage.content,
                        newMessage.content
                    ], err => {
                        if (err) {
                            console.error(err);
                        }
                    });
                }).catch(err => {
                    console.error(err);
                });

                guild.getSetting("lde-enabled", "boolean").then(enabled => {
                    guild.getSetting("lde-message-edit", "boolean").then(messageEditEnabled => {
                        if (enabled && messageEditEnabled) {
                            guild.getSetting("lde-channel", "channel").then(channel => {
                                channel.send({content: ' ', embeds: [new MessageEmbed()
                                        .setTitle("Message Edited")
                                        .addField("Channel", oldMessage.channel.toString(), true)
                                        .addField("Author", oldMessage.author.toString(), true)
                                        .addField("Old Message", "```\n" + oldMessage.content.replace(/\\`/g, "`").replace(/`/g, "\\`") + "```", false)
                                        .addField("New Message", "```\n" + newMessage.content.replace(/\\`/g, "`").replace(/`/g, "\\`") + "```", false)
                                        .setColor(0x4c80d4)
                                        .setAuthor({name: oldMessage.author.username, iconURL: oldMessage.author.avatarURL()})]});
                            }).catch(console.error);
                        }
                    }).catch(console.error);
                }).catch(console.error);
            }).catch(err => {
                console.error(err);
            });
        }
    }
};

module.exports = listener;