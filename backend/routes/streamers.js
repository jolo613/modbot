const {Router} = require("express");
const api = require("../../api/index");
 
const router = Router();

router.get("/", async (req, res) => {
    let result = await (await api.getFullIdentity(req.session.identity.id)).getActiveModeratorChannels();
    result = result.map(x => x.modForIdentity);

    try {
        res.json({success: true, data: result});
    } catch (err) {
        console.error(err);
    }
});
 
module.exports = router;