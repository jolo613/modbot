const fs = require("fs");
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

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

const rest = new REST({ version: '9' }).setToken(config.discord.token);

module.exports = (async client => {
    try {
        await client.application?.commands.set(commands);

        console.log('Successfully set commands');
    } catch (error) {
        console.error(error);
    }
});