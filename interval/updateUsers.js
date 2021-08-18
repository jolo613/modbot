const con = require("../database");
const {TwitchAPI} = require("../api");

module.exports = () => {
    con.query("select id, display_name from twitch__user where follower_count is null or date_add(last_updated, interval 1 day) < now();", (err, res) => {
        if (err) return;
        
        res.forEach(async user => {
            let followers = await TwitchAPI.helix.users.getFollows({followedUser: user.id});

            con.query("update twitch__user set follower_count = ? where id = ?;", [followers.total, user.id]);

            let helixUser = await TwitchAPI.helix.users.getUserById(user.id);

            if (helixUser === null) {
                con.query("update twitch__user set last_updated = date_add(now(), interval 2 day) where id = ?;", [user.id]);
                return;
            }

            if (helixUser.displayName.toLowerCase() !== user.display_name.toLowerCase()) {
                con.query("update twitch__username set last_seen = now() where id = ? and display_name = ?;", [user.id, user.display_name]);
                con.query("insert into twitch__username (id, display_name) values (?, ?);", [user.id, helixUser.displayName]);
            }

            con.query("update twitch__user set display_name = ?, description = ?, profile_image_url = ?, offline_image_url = ?, view_count = ?, last_updated = now() where id = ?;", [
                helixUser.displayName,
                helixUser.description,
                helixUser.profilePictureUrl,
                helixUser.offlinePlaceholderUrl,
                helixUser.views,
                helixUser.id,
            ]);
        });
    });
};
