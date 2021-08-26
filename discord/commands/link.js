const {MessageEmbed} = require("discord.js");

const command = {
    data: {
        name: 'link'
        , description: 'Link your discord account to your TMSQD identity'
    },
    execute(interaction) {
        const embed = new MessageEmbed()
                .setTitle("Welcome to Twitch Mod Squad!")
                .setDescription(`Get access to TMS channels by authenticating your account with twitch [here](https://tmsqd.co/twitch).`)
                .setColor(0x772ce8);

        interaction.reply({content: ' ', embeds: [embed], ephemeral: true});
    }
};

module.exports = command;