const client = global.client.mbm;

const listener = {
    name: 'lookupSelectManager',
    eventName: 'interactionCreate',
    eventType: 'on',
    listener (interaction) {
        if (!interaction.isSelectMenu()) return;
    
        console.log(interaction);
    }
};

module.exports = listener;