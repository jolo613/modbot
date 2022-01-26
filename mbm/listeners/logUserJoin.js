const {Discord} = require("../../api/index");
const DiscordUser = require("../../api/discord/DiscordUser");

const listener = {
    name: 'logUserJoin',
    eventName: 'guildMemberAdd',
    eventType: 'on',
    listener (member) {
        Discord.getUserById(member.id).then(() => {}, err => {
            let discordUser = new DiscordUser(
                member.id,
                null,
                member.user.username,
                member.user.discriminator,
                member.users.avatar
            );
            discordUser.post().catch(console.error);
        })
    }
};

module.exports = listener;