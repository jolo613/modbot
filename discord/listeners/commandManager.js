const {MessageEmbed} = require("discord.js");
const client = global.client.discord;

const listener = {
    name: 'commandManager',
    eventName: 'interactionCreate',
    eventType: 'on',
    listener (interaction) {
        if (!interaction.isCommand()) return;
    
        if (!client.commands.has(interaction.commandName)) return;
    
        let cmd = client.commands.get(interaction.commandName);

        const success = message => {
            const embed = new MessageEmbed()
                .setTitle("Success!")
                .setDescription(message)
                .setColor(0x772ce8);

            interaction.reply({content: ' ', embeds: [embed], ephemeral: true})
        }

        const error = message => {
            const embed = new MessageEmbed()
                .setTitle("Error!")
                .setDescription(message)
                .setColor(0xe83b3b);

            interaction.reply({content: ' ', embeds: [embed], ephemeral: true})
        }

        interaction.success = success;
        interaction.error = error;

        try {
            cmd.execute(interaction);
        } catch (error) {
            console.error(error);
            interaction.reply('***There was an error trying to execute that command!***');
        }
    }
};

module.exports = listener;