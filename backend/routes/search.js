const {Router} = require("express");

const con = require("../../database");
const api = require("../../api/index");
 
const router = Router();

const checkNumber = _string => !(Number.isNaN(Number(_string)));


const search = async (req, res) => {
    let result = {success: true, identityResults: []};
    let limit = 10;

    if (req.params?.limit && checkNumber(req.params.limit)) {
        limit = Math.min(10, Number(req.params.limit));
    }

    let query = req.params.query.replace(/(?:%|_|\\)/g, '');

    let identities = await con.pquery("select id from identity where name like ? limit ?;", [query + "%", limit]);
    
    for (let ii = 0; ii < identities.length; ii++) {
        let identity = await (api.getFullIdentity(identities[ii].id));
        result.identityResults = [
            ...result.identityResults,
            identity,
        ];
    }

    res.json(result);
}

router.get('/:query', search);
router.get('/:query/limit/:limit', search);

 
module.exports = router;