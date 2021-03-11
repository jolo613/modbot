const fs = require('fs');
const Discord = require("discord.js");
const client = new Discord.Client();

client.commands = new Discord.Collection();

const config = require("../config.json");
const prefix = config.prefix;

const commandFiles = fs.readdirSync('./discord/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log(`Discord bot ready! Logged in as ${client.user.tag}!`);
    console.log(`Bot has started with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
});

// implement commands
client.on('message', async message => {
    message.bot_id = client.user.id;

    // we can't have messages with no guild attached after this point
    if (message.guild === undefined || message.guild === null) return;

    // if the message is sent by a bot, we don't need process this at all.
    if (message.author.bot) return;

    // if the message doesn't start with the prefix we don't need to process this as a command.
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if (!client.commands.has(command)) return;

    let cmd = client.commands.get(command);
    
    if (!cmd.hasOwnProperty("permission") || message.guild.member(message.author.id).hasPermission(cmd.permission)) {
    try {
        cmd.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('There was an error trying to execute that command!');
    }
    } else {
        message.reply(`Insufficient permission! You need \`${cmd.permission}\``);
    }
});

client.on("guildMemberAdd", member => {
    if (config.hasOwnProperty("modsquad_discord") && config.hasOwnProperty("notlinked_role") && member.guild.id === config.modsquad_discord) {
        member.roles.add(config.notlinked_role);
    }
});

client.login(config.token);

module.exports = client;