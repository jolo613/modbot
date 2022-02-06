const {Discord} = require("../../api/index");
const DiscordUser = require("../../api/Discord/DiscordUser");

const listener = {
    name: 'logUserJoin',
    eventName: 'guildMemberAdd',
    eventType: 'on',
    async listener (member) {
        let guild;

        try {
            guild = await Discord.getGuild(member.guild.id);
        } catch (err) {}
        
        Discord.getUserById(member.id).then(user => {
            if (guild) guild.addUser(user).then(() => {}, console.error);
        }, err => {
            let discordUser = new DiscordUser(
                member.id,
                null,
                member.user.username,
                member.user.discriminator,
                member.user.avatar
            );
            discordUser.post().catch(console.error);
            if (guild) guild.addUser(user).then(() => {}, console.error);
        })
    }
};

module.exports = listener;