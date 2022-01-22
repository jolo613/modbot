const Discord = require("discord.js");
const games = require("../games");

const command = {
    data: {
        name: 'roles'
        , description: 'Allows you to select Game roles!'
    },
    execute(interaction) {
        const embed = new Discord.MessageEmbed()
                .setTitle("Game Roles!")
                .setDescription('Select a game role below then "Add Role" or "Remove Role" to manage your games.')
                .setColor(0x00FFFF);

        let options = games.map(x => {return {value: x.role, label: x.label, emoji: x.emoji}});

        let selectMenu = new Discord.MessageSelectMenu()
                .setCustomId("role-select")
                .addOptions(options)
                .setPlaceholder("Select games to add or remove!")
                .setMinValues(options);

        const row1 = new Discord.MessageActionRow()
                .addComponents(selectMenu);

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
        
        const row2 = new Discord.MessageActionRow()
                .addComponents(addButton, removeButton, setButton);
        
        interaction.reply({content: ' ', embeds: [embed], components: [row1, row2], ephemeral: true});
    }
};

module.exports = command;