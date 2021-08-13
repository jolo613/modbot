const fs = require("fs");

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
        console.log(await client.api.application(client.user.id).commands.set(commands));

        console.log('Successfully set commands');
    } catch (error) {
        console.error(error);
    }
});