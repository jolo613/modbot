const {Router} = require("express");
const {TwitchUserService} = require("../../api");

const twitch = require("../../twitch/twitch");

const router = Router();

router.get("/", async (req, res) => {
    let clients = twitch.getClients();

    let result = [];

    for (let i = 0; i < clients.length; i++) {
        let client = clients[i];
        let channels = [];

        for (let ic = 0; ic < client.channels.length; ic++) {
            let channel = client.channels[ic];

            channels = [
                ...channels,
                await TwitchUserService.resolveByName(channel)
            ];
        }

        result[i] = {id: i, status: client.status, channels: channels};
    }

    res.json({success: true, data: result});
});
 
module.exports = router;