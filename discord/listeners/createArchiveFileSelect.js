const { Modal, TextInputComponent, showModal } = require('discord-modals');
const client = global.client.discord;

const listener = {
    name: 'createArchiveFileSelect',
    eventName: 'interactionCreate',
    eventType: 'on',
    listener (interaction) {
        if (interaction.isSelectMenu() && interaction.component.customId === "file-name") {
            const modal = new Modal()
                .setCustomId("filename-" + interaction.values[0])
                .setTitle("Rename file #" + interaction.values[0])
                .addComponents(
                    new TextInputComponent()
                        .setCustomId("new-name")
                        .setLabel("File Name")
                        .setStyle("SHORT")
                        .setMinLength(4)
                        .setMaxLength(64)
                        .setPlaceholder("Choose a new name!")
                        .setRequired(true)
                );
            
            showModal(modal, {
                client: client,
                interaction: interaction,
            })
        }
    }
};

module.exports = listener;