const Discord = require("discord.js");

const games = require("../games");

let storedGameLists = {};

const listener = {
    name: 'gameRolesManager',
    eventName: 'interactionCreate',
    eventType: 'on',
    listener (interaction) {
        if (interaction.isButton()) {
            console.log(storedGameLists[interaction.member.id]);
            interaction.reply("oop");
        } else if (interaction.isSelectMenu()) {
            storedGameLists[interaction.member.id] = interaction.values;
            

            const addButton = new Discord.MessageButton()
                    .setCustomId("add-roles")
                    .setLabel("Add Roles")
                    .setStyle("SUCCESS");

            const removeButton = new Discord.MessageButton()
                    .setCustomId("remove-roles")
                    .setLabel("Remove Roles")
                    .setStyle("DANGER");

            const setButton = new Discord.MessageButton()
                    .setCustomId("set-roles")
                    .setLabel("Set Roles")
                    .setStyle("PRIMARY");

            const row = new Discord.MessageActionRow()
                    .addComponents(addButton, removeButton, setButton);

            interaction.reply({content: ' ', embeds: [new Discord.MessageEmbed().setTitle("Saved Game Choices!").setDescription(`You've selected ${interaction.values.length} game${interaction.values.length === 1 ? "" : "s"}. Use a button below to save.`).setColor(0x2dad3e)], components: [row], ephemeral: true});
        }
    }
};

module.exports = listener;