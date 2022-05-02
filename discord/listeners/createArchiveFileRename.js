const con = require("../../database");
const {parse, delayMessage} = require("./createArchiveManager");

const listener = {
    name: 'createArchiveFileRename',
    eventName: 'modalSubmit',
    eventType: 'on',
    listener (modal) {
        if (modal.customId.startsWith("filename-")) {
            let fileId = modal.customId.replace("filename-", "");

            con.query("update archive__create_files set name = ? where archive_id = ? and id = ?;", [modal.getTextInputValue("new-name"), modal.channel.id, fileId], (err, res) => {
                if (err) {
                    console.error(err);
                    delayMessage(modal, "reply", "Failed!", 3000)
                    return;
                }

                parse(modal.channel);
                delayMessage(modal, "reply", `File #${fileId} was successfully renamed!`, 3000)
            });
        }
    }
};

module.exports = listener;