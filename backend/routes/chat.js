const {Router} = require("express");
const api = require("../../api/index");
 
const router = Router();

router.get("/", (req, res) => {
    api.Twitch.Chat.getLogs(
        req.query.channel,
        req.query.user,
        req.query.time_start,
        req.query.time_end,
        req.query.limit,
        req.query.offset
    ).then(logs => {
        res.json({success: true, data: logs});
    }, err => {
        res.json({success: false, error: err});
    });
});
 
module.exports = router;