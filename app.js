global.client = {};

// Load Discord Module
require("./discord/discord");

// Load Twitch Module
require("./twitch/twitch");

// Load Express Backend
require("./backend/express");

// Load websocket
require("./websocket/websocket");

// Load global intervals
const updateUsers = require("./interval/updateUsers");
const fetchModerators = require("./interval/fetchModerators");
const updateTwitchUsernames = require("./interval/updateTwitchUsernames");

updateUsers();
fetchModerators();
updateTwitchUsernames();

setInterval(updateUsers, 30000);
setInterval(fetchModerators, 30000);
setInterval(updateTwitchUsernames, 60000);