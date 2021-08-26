const Discord = require("discord.js");
const config = require("../../config.json");

const listener = {
    name: 'welcomeMessage',
    eventName: 'guildMemberAdd',
    eventType: 'on',
    listener (member) {
        if (config.hasOwnProperty("modsquad_discord") && config.hasOwnProperty("notlinked_role") && member.guild.id === config.modsquad_discord) {
            member.roles.add(config.notlinked_role).catch(console.error);

            if (config.hasOwnProperty("notification_channel")) {
                const embedPublic = new Discord.MessageEmbed()
                        .setTitle(`Welcome to Twitch Mod Squad, ${member.displayName}!`)
                        .setDescription("In order to gain access to Twitch Mod Squad, you must verify your account. Verify your account [here](https://tmsqd.co/twitch).")
                        .setColor(0x772ce8);
    
                member.guild.channels.resolve(config.notification_channel).send({content: ' ', embeds: [embedPublic]});
            }
        }
    }
};

module.exports = listener;