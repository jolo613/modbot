const {Router} = require("express");
const con = require("../../database");
const API = require("../../api");

const IdentityService = new API.IdentityService();
 
const router = Router();

router.get("/", async (req, res) => {
    res.json({success: true, data: await IdentityService.getStreamers(req.session.identity.id)});
});
 
module.exports = router;