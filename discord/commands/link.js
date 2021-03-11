const {MessageEmbed} = require("discord.js");

const command = {
    name: 'link'
    , description: 'Link your discord account to a Twitch username'
    , usage: `link`
    , execute(message, args) {
        const embed = new MessageEmbed()
                .setTitle("Welcome to Twitch Mod Squad!")
                .setDescription(`Get access to TMS channels by authenticating your account with twitch [here](https://tmsqd.co/link/${message.author.id}).`)
                .setColor(0x772ce8);

        message.author.send(embed);
    }
};

module.exports = command;