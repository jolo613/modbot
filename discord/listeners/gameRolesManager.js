const Discord = require("discord.js");

const games = require("../games");

let storedGameLists = {};

const listener = {
    name: 'gameRolesManager',
    eventName: 'interactionCreate',
    eventType: 'on',
    listener (interaction) {
        if (interaction.isButton()) {
            console.log(storedGameLists[interaction.id]);
            interaction.reply("oop");
        } else if (interaction.isSelectMenu()) {
            storedGameLists[interaction.id] = interaction.values;
            interaction.reply({content: ' ', embeds: [new Discord.MessageEmbed().setTitle("Saved Game Choices!").setDescription(`You've selected ${interaction.values.length} game${interaction.values.length === 1 ? "" : "s"}. Use a button above to save.`).setColor(0x2dad3e)], ephemeral: true});
        }
    }
};

module.exports = listener;