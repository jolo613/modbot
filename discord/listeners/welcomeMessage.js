const Discord = require("discord.js");

const listener = {
    name: 'welcomeMessage',
    eventName: 'guildMemberAdd',
    eventType: 'on',
    listener (member) {
        if (config.hasOwnProperty("modsquad_discord") && config.hasOwnProperty("notlinked_role") && member.guild.id === config.modsquad_discord) {
            member.roles.add(config.notlinked_role);

            const embed = new Discord.MessageEmbed()
                    .setTitle("Welcome to Twitch Mod Squad!")
                    .setDescription(`Get access to TMS channels by authenticating your account with twitch [here](https://tmsqd.co/discord).`)
                    .setColor(0x772ce8);

            member.send(embed).then(() => {
                if (config.hasOwnProperty("notification_channel")) {
                    const embedPublic = new Discord.MessageEmbed()
                            .setTitle(`Welcome to Twitch Mod Squad, ${member.displayName}!`)
                            .setDescription("Follow the link sent in a DM to link your account to TMS. This will give you access to the rest of the channels!")
                            .setColor(0x772ce8);
        
                    member.guild.channels.resolve(config.notification_channel).send(embedPublic);
                }
            }).catch(() => {
                if (config.hasOwnProperty("notification_channel")) {
                    const embedPublic = new Discord.MessageEmbed()
                            .setTitle(`Welcome to Twitch Mod Squad, ${member.displayName}!`)
                            .setDescription("We weren't able to send you a DM! This is probably due to your privacy settings.\nTry sending !link directly to the ModBot user (me), change your privacy settings, or DM <@267380687345025025>")
                            .setColor(0x772ce8);
        
                    member.guild.channels.resolve(config.notification_channel).send(embedPublic);
                }
            });
        }
    }
};

module.exports = listener;