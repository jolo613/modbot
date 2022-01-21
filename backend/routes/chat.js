const {Router} = require("express");
const api = require("../../api/index");
 
const router = Router();

router.get("/", (req, res) => {
    api.Twitch.Chat.getLogs(
        req.params.channel,
        req.params.user,
        req.params.time_start,
        req.params.time_end,
        req.params.limit,
        req.params.offset
    ).then(logs => {
        res.json({success: true, data: logs});
    }, err => {
        res.json({success: false, error: err});
    });
});
 
module.exports = router;