const {Router} = require("express");
const api = require("../../api/index");
 
const router = Router();

router.get("/", (req, res) => {
    res.json({success: true, data: req.session.identity});
});
 
router.get('/:twitchId', (req, res) => {
    api.Twitch.getUserById(req.params.twitchId).then(twitchUser => {
        res.json({success: true, data: twitchUser});
    }).catch(err => {
        if (err === "User not found!") {
            res.json({success: true, data: null});
        } else {
            res.json({success: false, error: err});
        }
    });
});
 
module.exports = router;