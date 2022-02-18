const {Router} = require("express");
const api = require("../../api/index");
 
const router = Router();

router.get("/", async (req, res) => {
    let result = await (await api.getFullIdentity(req.session.identity.id)).getActiveModeratorChannels();
    result = result.map(x => x.modForIdentity);

    res.json({success: true, data: result});
});
 
module.exports = router;