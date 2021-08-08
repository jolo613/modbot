const {Router} = require("express");
const con = require("../../database");
const API = require("../../api");

const IdentityService = new API.IdentityService();
 
const router = Router();

router.get("/", (req, res) => {
    res.json({success: true, data: req.session.identity});
});
 
router.get('/:identityId', (req, res) => {
    IdentityService.resolveIdentity(req.params.identityId).then(identity => {
        res.json({success: true, data: identity});
    }).catch(err => {
        if (err === "Identity not found") {
            res.json({success: true, data: null});
        } else {
            res.json({success: false, error: err});
        }
    });
});
 
module.exports = router;