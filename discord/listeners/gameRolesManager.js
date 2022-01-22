const games = require("../games");

const listener = {
    name: 'gameRolesManager',
    eventName: 'interactionCreate',
    eventType: 'on',
    listener (interaction) {
        if (interaction.isButton()) {

        } else if (interaction.isSelectMenu()) {

        }
    }
};

module.exports = listener;