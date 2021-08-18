const express = require("express");
const config = require("../config.json");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const routes = require("./routes");
const con = require("../database");
const {IdentityService} = require("../api");

const app = express();

app.use(cookieParser());
app.use(cors());

app.use('/', (req, res, next) => {
    let session = req.cookies?.session;

    if (req.headers.authorization) {
        session = req.headers.authorization;
    }

    if (session === null || session === undefined) {
        res.status(401);
        res.json({success: false, error: "Not authenticated"});
        return;
    }

    con.query("select s.id as sid, s.created as screated, i.id as iid, i.name as iname from session as s left join identity as i on i.id = s.identity_id where s.id = ?;", [session], (err, result) => {
        if (err) {
            res.status(401);
            res.json({success: false, error: err});
            return;
        } else {
            if (result.length > 0) {
                let row = result[0];
                IdentityService.resolveIdentity(row["iid"]).then(identity => {
                    req.session = {id: row.sid, created: row.screated, identity: identity};
                    next();
                }).catch(err => {
                    res.json({success: false, error: err});
                });
            } else {
                res.status(401);
                res.json({success: false, error: "Not authenticated"});
            }
        }
    });
});

app.use('/identity', routes.identity);
app.use('/streamers', routes.streamers);
app.use('/status', routes.status);

app.get('/', (req, res) => {
    res.status(404);
    res.json({success: false, error: "Not found"});
});

app.listen(config.backend.port, () => {
    console.log("Express server started on port " + config.backend.port);
});
