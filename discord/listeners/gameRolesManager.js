const games = require("../games");

const listener = {
    name: 'gameRolesManager',
    eventName: 'interactionCreate',
    eventType: 'on',
    listener (interaction) {
        if (interaction.isButton()) {
            console.log(interaction);
        } else if (interaction.isSelectMenu()) {
            console.log(interaction);
        }
    }
};

module.exports = listener;