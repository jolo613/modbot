const {Router} = require("express");
const api = require("../../api/index");
 
const router = Router();

router.get("/", (req, res) => {
    api.Twitch.Chat.getLogs(
        req.query.channel,
        req.query.user,
        req.query.time_start,
        req.query.time_end,
        req.query.limit ? Number(req.query.limit) : undefined,
        req.query.offset ? Number(req.query.offset) : undefined
    ).then(logs => {
        res.elapsedJson({success: true, data: logs});
    }, err => {
        res.json({success: false, error: err});
    });
});

router.get("/overview/:user", (req, res) => {
    api.Twitch.Chat.getOverview(req.params.user).then(overview => {
        res.elapsedJson({success: true, data: overview});
    }, err => {
        res.json({success: false, error: err});
    })
})

router.get("/:channel", (req, res) => {
    api.Twitch.Chat.getLogs(
        req.params.channel,
        req.query.user,
        req.query.time_start,
        req.query.time_end,
        req.query.limit ? Number(req.query.limit) : undefined,
        req.query.offset ? Number(req.query.offset) : undefined
    ).then(logs => {
        res.elapsedJson({success: true, data: logs});
    }, err => {
        res.json({success: false, error: err});
    });
});

router.get("/:channel/:user", (req, res) => {
    if (req.params.channel === "all") req.params.channel = null;
    api.Twitch.Chat.getLogs(
        req.params.channel,
        req.params.user,
        req.query.time_start,
        req.query.time_end,
        req.query.limit ? Number(req.query.limit) : undefined,
        req.query.offset ? Number(req.query.offset) : undefined
    ).then(logs => {
        res.elapsedJson({success: true, data: logs});
    }, err => {
        res.json({success: false, error: err});
    });
});
 
module.exports = router;