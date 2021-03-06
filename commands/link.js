const https = require("https");
const config = require("../config.json");

const {MessageEmbed} = require("discord.js");

const FOLLOWER_REQUIREMENT = 1000;

const command = {
    name: 'link'
    , description: 'Link your discord account to a Twitch username'
    , usage: `link <Twitch Username>`
    , execute(message, args) {
        if (args.length >= 1) {
            console.log("sending request.");
            https.request({
                host: "modlookup.3v.fi",
                path: "/api/user-v3/" + encodeURIComponent(args[0]) + "?limit=2000&cursor="
            }, response => {
                let str = '';

                //another chunk of data has been received, so append it to `str`
                response.on('data', function (chunk) {
                    str += chunk;
                });

                //the whole response has been received, so we just print it out here
                response.on('end', function () {
                    try {
                        let data = JSON.parse(str.trim());

                        if (data.status == 200) {
                            if (data.hasOwnProperty("channels") && data.channels.length > 0) {
                                let foundChannels = "";
                                let addedChannels = "";

                                message.member.roles.cache.each(async role => {
                                    await message.member.roles.remove(role).catch(console.error);
                                });

                                data.channels.forEach(channel => {
                                    let str = "\n" + channel.name + " (" + channel.followers + (channel.hasOwnProperty("partnered") && channel.partnered ? "[✔]" : "") + ")";
                                    
                                    foundChannels += str;
                                    if (channel.followers >= FOLLOWER_REQUIREMENT) {
                                        addedChannels += str;

                                        let role = message.guild.roles.cache.find(role => role.name.toLowerCase() === channel.name.toLowerCase());

                                        if (role !== undefined && role !== null) {
                                            message.member.roles.add(role);
                                        } else {
                                            message.guild.roles.create({
                                                data: {
                                                    name: channel.name.toLowerCase(),
                                                    hoist: true,
                                                    mentionable: true
                                                }
                                            }).then(role => {
                                                message.member.roles.add(role);
                                            }).catch(console.error);
                                        }
                                    }
                                });

                                const embed = new MessageEmbed()
                                    // Set the title of the field
                                    .setTitle(`Discord User Configured`)
                                    // Set the description of the field
                                    .setDescription(`Using Twitch user: \`${data.hasOwnProperty("user") ? data.user : args[0].toLowerCase()}\``)
                                    // Set the color of the embed
                                    .setColor(0x772ce8)
                                    // Set the main content of the embed
                                    .addField(
                                            "Channel Requirement",
                                            `Follower requirement to be added as a role: \`${FOLLOWER_REQUIREMENT} followers\``,
                                            false
                                        )
                                    .addField(
                                            "Detected Channels",
                                            "```" + foundChannels + "```",
                                            true
                                        )
                                    .addField(
                                            `Added Channels`,
                                            "```" + addedChannels + "```",
                                            true
                                        );
                                
                                message.channel.send(embed);
                            } else {
                                message.reply(`The channel \`${data.hasOwnProperty("user") ? data.user : args[0].toLowerCase()}\` doesn't appear to be a moderator anywhere!`);
                            }
                        } else {
                            console.log(data);
                            message.reply("API sent a non-200 response code (more accurately, " + data.status + "). Honestly, <@267380687345025025> is kind of a lazy fuck and didn't put in any catch logic for this kind of error.");
                        }
                    } catch (e) {
                        console.log(e);
                        console.log("Could not parse " + str);
                        message.reply("API sent a non-JSON response. Honestly, <@267380687345025025> is kind of a lazy fuck and didn't put in any catch logic for this kind of error.");
                    }
                });
            }).end();
        } else {
            message.reply(`Missing Twitch username. Usage: \`${config.prefix + command.usage}\``);
        }
    }
};

module.exports = command;