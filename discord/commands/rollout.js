const {MessageEmbed} = require("discord.js");

const command = {
    name: 'rollout'
    , description: ''
    , usage: ``
    , execute(message, args) {
        if (message.member.id !== "267380687345025025" || args.length === 0) {
            message.reply("You aren't <@267380687345025025>. Stranger.");
            return;
        }

        if (args[0] === "1") {
            let keepRoles = ["modbot", "not linked", "toastfps", "admin", "@everyone"];

            let removeRoles = [];

            message.guild.roles.cache.each(role => {
                if (!keepRoles.includes(role.name.toLowerCase())) {
                    removeRoles = [
                        ...removeRoles,
                        role
                    ];
                }
            });

            message.guild.roles.remove(removeRoles);
        } else if (args[0] === "2") {
            message.guild.members.cache.each(member => {
                const embed = new MessageEmbed()
                        .setTitle("Welcome to Twitch Mod Squad!")
                        .setDescription(`Get access to TMS channels by authenticating your account with twitch [here](https://tmsqd.co/link/${member.id}).`)
                        .setColor(0x772ce8);
                member.send(embed);
            });
        }
    }
};

module.exports = command;