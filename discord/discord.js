const fs = require('fs');
const Discord = require("discord.js");
const client = new Discord.Client();

const uuid = require("uuid");

const con = require("../database");

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

// implement mod comments
client.on('message', message => {

    if (message.hasOwnProperty("reference") && message.reference && message.reference.messageID) {
        if (message.content.trim().startsWith("!")) return;

        con.query("select id, userid, username from ban where discord_message = ?;", [message.reference.messageID], (err, res) => {
            if (err) {console.error(err);return;}

            if (res.length === 1) {
                let ban = res[0];

                con.query("select id, display_name from user where discord_id = ?;", message.member.id, (guerr, gures) => {
                    if (guerr) {console.error(guerr);return;}

                    if (gures.length === 1) {
                        let mod = gures[0];

                        con.query("insert into comment (mod__id, mod__display_name, target__id, target__display_name, target_ban, target_timeout, time_created, comment_discord_sf, comment) values (?, ?, ?, ?, ?, null, null, ?, ?);", [
                            mod.id, mod.display_name, ban.userid, ban.username, ban.id, message.id, message.content
                        ], (ierr, ires) => {
                            if (ierr) {console.error(ierr);return;}

                            
                        });
                    }
                });
            }
        });
    }

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
                        .setTitle(`Welcome to Twitch Mod Squad, ${member.displayName}!`)
                        .setDescription("Follow the link sent in a DM to link your account to TMS. This will give you access to the rest of the channels!")
                        .setColor(0x772ce8);
    
                member.guild.channels.resolve(config.notification_channel).send(embedPublic);
            }
        }).catch(() => {
            if (config.hasOwnProperty("notification_channel")) {
                const embedPublic = new Discord.MessageEmbed()
                        .setTitle(`Welcome to Twitch Mod Squad, ${member.displayName}!`)
                        .setDescription("We weren't able to send you a DM! This is probably due to your privacy settings.\nTry sending !link directly to the ModBot user (me), change your privacy settings, or DM <@267380687345025025>")
                        .setColor(0x772ce8);
    
                member.guild.channels.resolve(config.notification_channel).send(embedPublic);
            }
        });
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.me) return; // We don't need to take action on things that the bot does.

    // When we receive a reaction we check if the reaction is partial or not
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message: ', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }
    
    if (reaction.emoji.name === '❌') {
        con.query("select userid, username from ban where discord_message = ?;", [reaction.message.id], (err, res) => {
            if (err) {console.error(err);return;}

            if (res.length === 1) {
                let userid = res[0].userid;
                let username = res[0].username;

                con.query("select id from user where discord_id = ?;", [user.id], (guerr, gures) => {
                    if (guerr || gures.length === 0) {
                        console.error(guerr);
                        reaction.message.channel.send(`${user} we couldn't get your Twitch ID from the database. Make sure you've linked your account to TMSQD`);
                    } else {
                        con.query("select streamer_name from mod_streamer where mod_id = ?;", [gures[0].id], (sgerr, sgres) => {
                            if (sgerr) {console.error(sgerr);return;}

                            sgres.forEach(streamer => {
                                con.query("insert into crossban (username, id, streamer, by_id) values (?, ?, ?);", [username, userid, streamer.streamer_name, gures[0].id], (err) => {if (err) console.error();});
                            });
                        });
                    }
                });
            }
        });
    }
});

client.login(config.token);

setTimeout(() => {
    require("./interval/authenticate")(client);
    require("./interval/crossban")(client);
}, 500);

module.exports = client;