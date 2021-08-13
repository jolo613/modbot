const fs = require("fs");
const config = require("../config.json");

const commandFiles = fs.readdirSync('./discord/commands').filter(file => file.endsWith('.js'));

let commands = [];

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands = [
        ...commands,
        command.data
    ]
}

module.exports = (async client => {
    try {
        await client.api.application(config.discord.application).commands.set(commands);

        console.log('Successfully set commands');
    } catch (error) {
        console.error(error);
    }
});