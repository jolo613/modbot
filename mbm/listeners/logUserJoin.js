const con = require("../../database");

const listener = {
    name: 'logUserJoin',
    eventName: 'guildMemberAdd',
    eventType: 'on',
    listener (member) {
        // con.query("insert into discord__user (id, name, discriminator, avatar) values (?, ?, ?, ?) on duplicate key update name = ?, discriminator = ?, avatar = ?;");
    }
};

module.exports = listener;