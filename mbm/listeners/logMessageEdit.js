const {Discord} = require("../../api/index");

const listener = {
    name: 'logMessageEdit',
    eventName: 'messageUpdate',
    eventType: 'on',
    listener (oldMessage, newMessage) {
        if (oldMessage.guildId && oldMessage.content !== newMessage.content) {
            Discord.getGuild(oldMessage.guildId).then(guild => {
                Discord.getUserById(oldMessage.author.id).then(user => {
                    con.query("insert into discord_edit (guild_id, channel_id, message_id, user_id, old_message, new_message) values (?, ?, ?, ?, ?, ?);", [
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
            }).catch(err => {
                console.error(err);
            });
        }
    }
};

module.exports = listener;