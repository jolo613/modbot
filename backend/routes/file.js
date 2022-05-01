const {Router} = require("express");
const api = require("../../api/index");
 
const router = Router();

router.get("/", (req, res) => {
    res.status(404);
    res.json({success: false, error: "Not found"});
});
 
router.get('/:file', (req, res) => {
    console.log(req.params.file);
});
 
module.exports = router;