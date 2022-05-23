const con = require("../database");
const api = require("../api/index");

let waiting = false;

module.exports = () => {
    if (waiting) return;
    waiting = true;
    con.query("select id, display_name from twitch__user where follower_count is null or date_add(last_updated, interval 7 day) < now() limit 100;", async (err, res) => {
        if (err) {
            console.error(err);
            return;
        }

        let userIds = [];

        res.forEach(user => {
            userIds = [
                ...userIds,
                user.id,
            ]
        });

        if (userIds.length < 10) return;

        console.log("Sending request...");

        let startTime = new Date().getTime();

        let helixUsers = await api.Twitch.Direct.helix.users.getUsersByIds(userIds);

        console.log(`Received ${helixUsers.length}/${userIds.length} users: ${new Date().getTime() - startTime} ms`);
        waiting = false;

        helixUsers.forEach(async helixUser => {
            let user = await api.Twitch.getUserById(helixUser.id);

            if (helixUser.displayName.toLowerCase() !== user.display_name.toLowerCase()) {
                con.query("update twitch__username set last_seen = now() where id = ? and display_name = ?;", [user.id, user.display_name]);
                con.query("insert into twitch__username (id, display_name) values (?, ?) on duplicate key update display_name = ?;", [user.id, helixUser.displayName, helixUser.displayName]);
            }

            con.query("update twitch__user set display_name = ?, description = ?, profile_image_url = ?, offline_image_url = ?, view_count = ?, affiliation = ?, last_updated = now() where id = ?;", [
                helixUser.displayName,
                helixUser.description,
                helixUser.profilePictureUrl,
                helixUser.offlinePlaceholderUrl,
                helixUser.views,
                helixUser.broadcasterType === "" ? null : helixUser.broadcasterType,
                helixUser.id,
            ], err => {
                if (err) console.error(err);
                api.Twitch.getUserById(helixUser.id, true);
            });
        });

        con.query("update twitch__user set last_updated = now() where id in (" + (", ?").repeat(userIds.length).substring(2) + ");", userIds);
        
        userIds.forEach(async userId => {

            let followers = await api.Twitch.Direct.helix.users.getFollows({followedUser: userId});

            con.query("update twitch__user set follower_count = ? where id = ?;", [followers.total, userId]);
        });
    });
};
