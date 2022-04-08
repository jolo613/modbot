const {Router} = require("express");
const con = require("../../database");
const bodyParser = require("body-parser");
 
const router = Router();

router.use(bodyParser.urlencoded({extended: true}));
router.use(bodyParser.json());

const parseShortlink = shortlink => {
    return new Promise(async (resolve, reject) => {
        if (shortlink.name !== null) {
            con.query("select * from shortlink__group where shortlink_id = ?;", [shortlink.id], (err, res) => {
                if (err) {reject(err);return;}


                resolve(shortlink);
            });
        } else
            resolve(shortlink);
    });
}

router.get("/", (req, res) => {
    con.query("select * from shortlink where created_id = ?;", [req.session.identity.id], (err, response) => {
        if (err) {
            res.json({success: false, error: err});
            return;
        }

        response.map()

        res.json({success: true, data: response});
    });
});

router.get("/:shortlink", (req, res) => {
    con.query("select * from shortlink where shortlink = ?;", [req.params.shortlink], (err, response) => {
        if (err) {
            res.json({success: false, error: err});
            return;
        }

        if (response.length > 0) {
            res.json({success: true, data: response[0]});
        } else {
            res.json({success: false, error: "Shortlink not found"});
        }
    });
});

router.post("/:shortlink", (req, res) => {

});

router.put("/:shortlink", (req, res) => {

});
 
module.exports = router;