const {MessageEmbed} = require("discord.js");
const config = require("../../config.json");

const errorEmbed = message => {
    return {content: ' ', embeds: [new MessageEmbed()
            .setTitle("Error:")
            .setDescription(message)
            .setColor(0xed3734)], ephemeral: true};
}

const command = {
    data: {
        name: 'register'
        , description: 'Register your Discord server to Twitch Mod Squad'
    },
    execute(interaction) {
        if (interaction.member?.id === interaction.guild?.ownerId) {
            if (interaction.guild.id !== config.modsquad_discord) {

            } else {
                interaction.reply(errorEmbed("This command can't be used in the Mod Squad discord!"));
            }
        } else {
            interaction.reply(errorEmbed("You are not the owner of this guild!"));
        }
    }
};

module.exports = command;