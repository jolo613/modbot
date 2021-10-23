const {MessageEmbed} = require("discord.js");
const {IdentityService,TwitchUserService,TwitchChatService,DiscordUserService,ViewService} = require("../../api");

const combine = (list1, list2) => {
    return [...list1, ...list2];
}

const insert = (list, item) => {
    return [...list, item];
}

const constructDiscordEmbed = account => {
    return new MessageEmbed()
            .setTitle(account.name + "#" + account.discriminator)
            .setURL("https://p.tmsqd.co/#/discord/" + account.id)
            .setThumbnail(`https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}.png`)
            .setDescription("**UN#DSCRM:** " + account.name + "#" + account.discriminator +
                    "\n**Discord ID:** " + account.id +
                    "\n**Mention:** <@" + account.id + ">");
}

const constructTwitchEmbed = async account => {
    let activeChannels;

    const achnls = await TwitchChatService.resolveActiveChannels(account.id);

    if (achnls.length === 0) {
        activeChannels = "\nNo activity found.";
    } else {
        let table = [["Name","Followers", "Last Active"]];

        for (let i = 0;i < achnls.length;i++) {
            let chnl = achnls[i];
            table = [
                ...table,
                [chnl.display_name + (chnl.affiliation === "partner" ? " ✓" : ""), ViewService.comma(chnl.follower_count), ViewService.parseDate(chnl.lastActive)],
            ]
        }

        activeChannels = ViewService.tabulate(table);
    }

    let twitchBans = "";
    const bans = await TwitchUserService.getBans(account.id);

    if (bans.length > 0) {
        let table = [["Streamer", "Time Banned", "Active"]];
        for (let i = 0;i < bans.length;i++) {
            let ban = bans[i];
            table = insert(table, [ban.streamer.display_name, ViewService.parseTimestamp(ban.timeBanned), ban.active ? "Yes" : "No"]);
        }
        twitchBans = ViewService.tabulate(table);
    } else {
        twitchBans = "No Bans Found!";
    }

    const embed = new MessageEmbed()
            .setTitle(account.display_name)
            .setURL("https://p.tmsqd.co/#/twitch/" + account.id)
            .setThumbnail(account.profile_image_url)
            .setDescription(`**ID:** ${account.id}\n**Username:** ${account.display_name}\n**Description:** ${account.description === "" ? "*No Description*" : account.description}\n**View Count:** ${account.view_count}\n**Follower Count:** ${account.follower_count}`)
            .addField("Active Channels", "```" + activeChannels + "```", false)
            .addField("Bans", "```" + twitchBans + "```", false)
            .setFooter("Note: Active channels only shows channels that TMS listens to.");
    return embed;
}

const constructIdentityEmbed = async identity => {
    // collect discord accounts
    let discordAccounts = "";
    let discordTags = "";

    if (identity.profiles.discord.length > 0) {
        let table = [["ID", "Name", "Discriminator"]];
        for (let i = 0;i < identity.profiles.discord.length;i++) {
            let chnl = identity.profiles.discord[i];
            table = [
                ...table,
                [chnl.id, chnl.name, chnl.discriminator],
            ]
            discordTags = ` <@${chnl.id}>`;
        }
        discordAccounts = ViewService.tabulate(table);
    } else {
        discordAccounts = "No Discord Accounts Linked!";
    }

    let twitchAccounts = "";

    let bans = [];

    if (identity.profiles.twitch.length > 0) {
        let table = [["ID", "Name", "Followers"]];
        for (let i = 0;i < identity.profiles.twitch.length;i++) {
            let chnl = identity.profiles.twitch[i];
            table = insert(table, [chnl.id + "", chnl.display_name + (chnl.affiliation === "partner" ? " ✓" : ""), ViewService.comma(chnl.follower_count)]);

            bans = combine(bans, await TwitchUserService.getBans(chnl.id));
        }
        twitchAccounts = ViewService.tabulate(table);
    } else {
        twitchAccounts = "No Twitch Accounts Linked!";
    }

    let twitchBans = "";

    if (bans.length > 0) {
        let table = [["Streamer", "Time Banned", "Active"]];
        for (let i = 0;i < bans.length;i++) {
            let ban = bans[i];
            table = insert(table, [ban.streamer.display_name, ban.timeBanned, ban.active ? "Yes" : "No"]);
        }
        twitchBans = ViewService.tabulate(table);
    } else {
        twitchBans = "No Bans Found!";
    }

    const embed = new MessageEmbed()
            .setTitle(identity.name)
            .setURL("https://p.tmsqd.co/#/identity/" + identity.id)
            .setThumbnail(identity.avatar_url)
            .setDescription(`**Identity ID:** ${identity.id}\n**Username:** ${identity.name}`)
            .addField("Discord Accounts", "```\n" + discordAccounts + "```" + discordTags)
            .addField("Twitch Accounts", "```\n" + twitchAccounts + "```")
            .addField("Twitch Bans", "```\n" + twitchBans + "```");
    return embed;
}

const resolveDiscord = async discordAccounts => {
    let embeds = [];

    for (let i = 0;i < discordAccounts.length;i++) {
        let account = discordAccounts[i];

        if (account.identity_id === null) {
            embeds = insert(embeds, await constructDiscordEmbed(account));
        } else {
            embeds = combine(embeds, await resolveIdentity([await IdentityService.resolveIdentity(account.identity_id)]));
        }
    }

    return embeds;
}

const resolveTwitch = async twitchAccounts => {
    let embeds = [];

    for (let i = 0;i < twitchAccounts.length;i++) {
        let account = twitchAccounts[i];

        if (account.identity.id === null) {
            embeds = insert(embeds, await constructTwitchEmbed(account));
        } else {
            embeds = combine(embeds, await resolveIdentity([await IdentityService.resolveIdentity(account.identity.id)]));
        }
    }

    return embeds;
}

const resolveIdentity = async identities => {
    let embeds = [];

    for (let i = 0;i < identities.length;i++) {
        let identity = identities[i];

        embeds = insert(embeds, await constructIdentityEmbed(identity));
    }

    return embeds;
}

const commandError = (interaction, err) => {
    const embed = new MessageEmbed()
        .setTitle("Error!")
        .setDescription(`Error: ${err}`)
        .setColor(0xed3734);

    interaction.reply({content: ' ', embeds: [embed], ephemeral: true});
}

const say = async (interaction, embeds) => {
    embeds = await Promise.resolve(embeds);

    if (embeds.length === 0) {
        embeds = [
            new MessageEmbed().setTitle("No results found!").setDescription("No results were returned from this query.").setColor(0xed3734)
        ]
    }
    interaction.reply({content: ' ', embeds: embeds, ephemeral: true});
}

const command = {
    data: {
        name: "lookup",
        description: "Run a lookup on the entire TMS database following the requested parameters.",
        options: [
            {
                name: "discord-id",
                description: "Searches based on a Discord ID",
                type: 3,
                required: false,
            },
            {
                name: "twitch-id",
                description: "Searches based on a Twitch ID",
                type: 3,
                required: false,
            },
            {
                name: "discord-name",
                description: "Searches based on a Discord Name, can include discriminator(ie.Twijn#8888) or just a name(ie.Twijn)",
                type: 3,
                required: false,
            },
            {
                name: "twitch-name",
                description: "Searches based on a Twitch Name",
                type: 3,
                required: false,
            },
            {
                name: "modfor-twitch-id",
                description: "Searches based on who moderates for a specific Twitch ID",
                type: 3,
                required: false,
            },
            {
                name: "modfor-twitch-name",
                description: "Searches based on who moderates for a specific Twitch Name",
                type: 3,
                required: false,
            },
        ]
    },
    execute(interaction) {
        if (interaction.options.getString("discord-id")) {
            DiscordUserService.resolveById(interaction.options.getString("discord-id")).then(async discordUser => {
                say(interaction, resolveDiscord([discordUser]));
            }).catch(err => commandError(interaction, err));
        } else if (interaction.options.getString("discord-name")) {
            let str = interaction.options.getString("discord-name").split("#");
            if (str.length === 1) {
                DiscordUserService.resolveByName(str[0]).then(discordUsers => {
                    say(interaction, resolveDiscord(discordUsers));
                }).catch(err => commandError(interaction, err));
            } else if (str.length === 2) {
                DiscordUserService.resolveByName(str[0], str[1]).then(discordUsers => {
                    say(interaction, resolveDiscord(discordUsers));
                }).catch(err => commandError(interaction, err));
            } else {
                const embed = new MessageEmbed()
                    .setTitle("Improper format!")
                    .setDescription(`Improper discord name format, should either contain only a name\`Twijn\`, or a name and discriminator, \`Twijn#8888\`. Make sure you don't have any outlying \`#\` characters.`)
                    .setColor(0xed3734);
    
                interaction.reply({content: ' ', embeds: [embed], ephemeral: true});
                return;
            }
        } else if (interaction.options.getString("twitch-id")) {
            TwitchUserService.resolveById(interaction.options.getString("twitch-id")).then(twitchUser => {
                say(interaction, resolveTwitch([twitchUser]));
            }).catch(err => commandError(interaction, err));
        } else if (interaction.options.getString("twitch-name")) {
            TwitchUserService.resolveByName(interaction.options.getString("twitch-name")).then(twitchUser => {
                say(interaction, resolveTwitch([twitchUser]));
            }).catch(err => commandError(interaction, err));
        } else {
            const embed = new MessageEmbed()
                .setTitle("Invalid Usage!")
                .setDescription(`You must provide at least one parameter for us to search properly.`)
                .setColor(0xed3734);

            interaction.reply({content: ' ', embeds: [embed], ephemeral: true});
        }
    }
};

module.exports = command;