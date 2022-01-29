const {MessageEmbed} = require("discord.js");
const api = require("../../api/index");

const settings = require("../settings.json");

const errorEmbed = message => {
    return {content: ' ', embeds: [new MessageEmbed()
            .setTitle("Error:")
            .setDescription(message)
            .setColor(0xed3734)], ephemeral: true};
}

let choices = settings.map(x => {
    return {
        name: `${x.name} [${x.type}]`,
        value: x.value,
    };
});

const command = {
    data: {
        name: 'setting'
        , description: 'Change settings for TMS MBM'
        , options: [
            {
                type: 3,
                name: "setting",
                description: "Setting to be changed",
                required: true,
                choices: choices,
            },
            {
                type: 3,
                name: "v-string",
                description: "String value",
                required: false,
            },
            {
                type: 4,
                name: "v-int",
                description: "Integer value",
                required: false,
            },
            {
                type: 5,
                name: "v-boolean",
                description: "Boolean value",
                required: false,
            },
            {
                type: 6,
                name: "v-user",
                description: "User value",
                required: false,
            },
            {
                type: 7,
                name: "v-channel",
                description: "Channel value",
                required: false,
            },
            {
                type: 8,
                name: "v-role",
                description: "Role value",
                required: false,
            },
            {
                type: 9,
                name: "v-mentionable",
                description: "Mentionable value",
                required: false,
            },
            {
                type: 10,
                name: "v-number",
                description: "Number value",
                required: false,
            },
        ]
        , default_permission: false
    },
    global: false,
    execute(interaction) {
        if (interaction.guildId) {
            api.Discord.getGuild(interaction.guildId).then(guild => {
                let setting = settings.find(x => x.value === interaction.options.getString("setting"));
                
                if (setting) {
                    let value = null;
                    if (setting.type === "string") {
                        value = interaction.options.getString("v-string");
                    } else if (setting.type === "boolean") {
                        value = interaction.options.getBoolean("v-boolean");
                    } else if (setting.type === "user") {
                        value = interaction.options.getUser("v-user")?.id;
                    } else if (setting.type === "channel") {
                        value = interaction.options.getChannel("v-channel")?.id;
                    } else if (setting.type === "role") {
                        value = interaction.options.getRole("v-role")?.id;
                    } else if (setting.type === "mentionable") {
                        value = interaction.options.getMentionable("v-mentionable")?.id;
                    } else if (setting.type === "number") {
                        value = interaction.options.getNumber("v-number");
                    }

                    if (value === undefined || value === null) {
                        interaction.reply(errorEmbed("Proper value was not provided! Expected v-" + setting.type));
                        return;
                    }

                    guild.setSetting(setting.value, value, setting.type);
                    guild.post().then(async() => {
                        interaction.reply({content: "Set!", ephemeral: true});
                    }, err => {
                        interaction.reply(errorEmbed(err));
                    });
                } else {
                    interaction.reply(errorEmbed(`Setting ${interaction.options.getString("setting")} does not exist!`));
                }
            }).catch(err => {console.error(err);interaction.reply(errorEmbed("" + err));});
        } else {
            interaction.reply(errorEmbed("Command must be sent in a guild"));
        }
    }
};

module.exports = command;