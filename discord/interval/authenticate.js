const con = require("../../database");
const config = require("../../config.json");

const https = require("https");
const {MessageEmbed} = require("discord.js");

const FOLLOWER_REQUIREMENT = 2000;

module.exports = client => {

    setInterval(() => {
        con.query("select tm.id, tm.display_name, tm.discord_id from auth join twitchmod as tm on tm.id = auth.mod_id;", (err, res) => {
            if (err) {console.error(err);return;}

            res.forEach(mod => {
                con.query("delete from auth where mod_id = ?;", [mod.id]);

                con.query("select mod_streamer.streamer_name as name from mod_streamer where mod_id = ?;", [mod.id], (err2, res2) => {
                    if (err2) {console.error(err2);return;}

                    https.request({
                        host: "modlookup.3v.fi",
                        path: "/api/user-v3/" + mod.display_name.toLowerCase() + "?limit=2000&cursor="
                    }, response => {
                        let str = '';
        
                        //another chunk of data has been received, so append it to `str`
                        response.on('data', function (chunk) {
                            str += chunk;
                        });
        
                        //the whole response has been received
                        response.on('end', async function () {
                            try {
                                let data = JSON.parse(str.trim());
        
                                if (data.status == 200) {
                                    if (data.hasOwnProperty("channels") && data.channels.length > 0) {
                                        let channels = [];
                                        let allChannelsStr = "";
        
                                        data.channels.forEach(channel => {
                                            if (channel.followers >= FOLLOWER_REQUIREMENT) {
                                                channels = [
                                                    ...channels,
                                                    channel.name
                                                ];

                                                allChannelsStr += `\n${channel.name}`;
                                            }
                                        });
        
                                        let finalChannels = [];
                                        let channelStr = "";
                                        console.log(channels);
                                        console.log(res);
                                        console.log(res2);
                                        res2.forEach(streamer => {
                                            if (channels.includes(streamer.streamer_name)) {
                                                finalChannels = [
                                                    ...finalChannels,
                                                    streamer_name
                                                ];

                                                channelStr += `\n${streamer_name}`;
                                            }
                                        });
                                        console.log(finalChannels);

                                        let guild = await client.guilds.fetch(config.modsquad_discord);
                                        let member = await guild.members.fetch(mod.discord_id);

                                        if (finalChannels.length === 0) {
                                            const embed = new MessageEmbed()
                                                    .setTitle("Failed to Link!")
                                                    .setDescription("We couldn't add any channels because the channels you mod for and the channels selected don't match.")
                                                    .addField("Detected Channels", "```" + allChannelsStr + "```");
                                            member.send(embed);
                                            return;
                                        }

                                        member.roles.remove(member.roles.cache).then(() => {
                                            let roles = []
                                            finalChannels.forEach(async channel => {
                                                let role = guild.roles.cache.find(role => role.name.toLowerCase() === channel.toLowerCase());

                                                if (role === null) {
                                                    message.guild.roles.create({
                                                        data: {
                                                            name: channel.name.toLowerCase(),
                                                            hoist: true,
                                                            mentionable: true
                                                        }
                                                    }).then(newRole => {
                                                        roles = [
                                                            ...roles,
                                                            newRole
                                                        ];
                                                    }).catch(console.error);
                                                } else {
                                                    roles = [
                                                        ...roles,
                                                        role
                                                    ];
                                                }

                                                member.roles.add(roles);

                                                const embed = new MessageEmbed()
                                                        .setTitle("Account Linked!")
                                                        .addField("Added Channels", "```" + channelStr + "```");
                                                member.send(embed);
                                            });
                                        });
                                    }
                                } else {
                                    console.error(data);
                                }
                            } catch (e) {
                                console.error(e);
                            }
                        });
                    }).end();
                });
            });
        });
    }, 1000);

}