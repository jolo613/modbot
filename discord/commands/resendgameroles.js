const Discord = require("discord.js");
const games = require("../games");

const command = {
    data: {
        name: 'resendgameroles'
        , description: 'Regenerates Mod Games role list. Only Twijn#8888 can use this command.'
    },
    execute(interaction) {
        if (interaction.member.id === "267380687345025025") {
            const embed = new Discord.MessageEmbed()
                    .setTitle("Game Roles!")
                    .setDescription('Select a game role below then "Add Role" or "Remove Role" to manage your games.')
                    .setColor(0x00FFFF);

            let selectMenu = new Discord.MessageSelectMenu();

            let options = games.map(x => {return {value: x.role, label: x.label, emoji: x.emoji}});
            selectMenu.setOptions(options);

            const addButton = new Discord.MessageButton()
                    .setLabel("Add Role")
                    .setStyle(Discord.MessageButtonStyle.PRIMARY);

            const removeButton = new Discord.MessageButton()
                    .setLabel("Remove Role")
                    .setStyle(Discord.MessageButtonStyle.DANGER);
            
            interaction.reply({content: ' ', embeds: [embed], components: [selectMenu, addButton, removeButton]});
        } else {
            interaction.reply({content: 'https://www.youtube.com/watch?v=dIhFU8JG_j0', ephemeral: true});
        }
    }
};

module.exports = command;