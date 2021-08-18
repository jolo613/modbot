const {Router} = require("express");
const con = require("../../database");
const {IdentityService} = require("../../api");
 
const router = Router();

router.get("/", async (req, res) => {
    res.json({success: true, data: await IdentityService.getStreamers(req.session.identity.id)});
});
 
module.exports = router;