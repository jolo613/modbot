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
    // if the message is sent by a bot, we don't need process this at all.
    if (message.author.bot) return;

    // if the message doesn't start with the prefix we don't need to process this as a command.
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if (!client.commands.has(command)) return;

    let cmd = client.commands.get(command);
    
    try {
        cmd.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('There was an error trying to execute that command!');
    }
});

client.on("guildMemberAdd", member => {
    if (config.hasOwnProperty("modsquad_discord") && config.hasOwnProperty("notlinked_role") && member.guild.id === config.modsquad_discord) {
        member.roles.add(config.notlinked_role);

        const embed = new Discord.MessageEmbed()
                .setTitle("Welcome to Twitch Mod Squad!")
                .setDescription(`Get access to TMS channels by authenticating your account with twitch [here](https://tmsqd.co/link/${member.id}).`)
                .setColor(0x772ce8);

        member.send(embed).then(() => {
            if (config.hasOwnProperty("notification_channel")) {
                const embedPublic = new Discord.MessageEmbed()
                        .setTitle("Welcome to Twitch Mod Squad!")
                        .setDescription("Follow the link sent in a DM to link your account to TMS. This will give you access to the rest of the channels!")
                        .setColor(0x772ce8);
    
                member.guild.channels.resolve(config.notification_channel).send(embedPublic);
            }
        }).catch(() => {
            if (config.hasOwnProperty("notification_channel")) {
                const embedPublic = new Discord.MessageEmbed()
                        .setTitle("Welcome to Twitch Mod Squad!")
                        .setDescription("We weren't able to send you a DM! This is probably due to your privacy settings.\nTry sending !link directly to the ModBot user (me), change your privacy settings, or DM <@267380687345025025>")
                        .setColor(0x772ce8);
    
                member.guild.channels.resolve(config.notification_channel).send(embedPublic);
            }
        });
    }
});

client.login(config.token);

setTimeout(() => {
    require("./interval/authenticate")(client);
}, 500);

module.exports = client;