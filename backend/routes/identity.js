const {Router} = require("express");
const con = require("../../database");
 
const router = Router();

router.get("/", (req, res) => {
    res.json({success: true, data: req.session.identity});
});
 
router.get('/:identityId', (req, res) => {
    con.query("select id, name from identity where id = ?;", [req.params.identityId], (err, result) => {
        if (err) {
            res.json({success: false, error: err});
        } else {
            res.json({success: true, data: result.length > 0 ? result[0] : null});
        }
    });
});
 
module.exports = router;