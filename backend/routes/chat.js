const {Router} = require("express");
const api = require("../../api/index");
 
const router = Router();

router.get("/", (req, res) => {
    api.Twitch.Chat.getLogs(
        req.query.channel,
        req.query.user,
        req.query.time_start ? new Date(req.query.time_start) : undefined,
        req.query.time_end ? new Date(req.query.time_end) : undefined,
        req.query.limit ? Number(req.query.limit) : undefined,
        req.query.offset ? Number(req.query.offset) : undefined
    ).then(logs => {
        res.json({success: true, data: logs});
    }, err => {
        res.json({success: false, error: err});
    });
});
 
module.exports = router;