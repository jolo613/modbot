const con = require("../../database");

const Entry = require("./Entry");
const EntryUser = require("./EntryUser");
const EntryFile = require("./EntryFile");

class Archive {
    /**
     * Gets an entry by an Entry ID
     * @param {string} id 
     * @returns {Promise<Entry>}
     */
    getEntryById(id) {
        return new Promise((resolve, reject) => {
            con.query("select * from archive where id = ?;", [id], (err, archiveRes) => {
                if (err) {reject(err);return;}

                if (archiveRes.length > 0) {
                    let entry = archiveRes[0];

                    con.query("select * from archive__users where archive_id = ?;", [id], (err, userRes) => {
                        if (err) {reject(err);return;}
        
                        let users = [];

                        userRes.forEach(user => {
                            users = [
                                ...users,
                                new EntryUser(user.id, user.type, user.user == 1, user.value),
                            ]
                        });

                        con.query("select * from archive__files where archive_id = ? order by label asc, name asc;", [id], async (err, fileRes) => {
                            if (err) {reject(err);return;}
        
                            let files = [];

                            fileRes.forEach(file => {
                                files = [
                                    ...files,
                                    new EntryFile(file.id, file.local_path, file.remote_path, file.name, file.label, file.content_type),
                                ];
                            });

                            resolve(new Entry(
                                entry.id,
                                await global.api.getFullIdentity(entry.owner_id),
                                entry.offense,
                                entry.description,
                                users,
                                files,
                                entry.time_submitted,
                            ));
                        });
                    });
                } else {
                    reject("No entry found!");
                }
            });
        });
    }
}

module.exports = Archive;