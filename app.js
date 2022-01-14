global.client = {};

// Load Discord Module
require("./discord/discord");

// Load Discord ModBot Mobile module
require("./mbm/mbm");

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
const updateDiscordUsernames = require("./interval/updateDiscordUsernames");
const updateLiveChannels = require("./interval/updateLiveChannels");

updateUsers();
fetchModerators();
updateTwitchUsernames();
updateDiscordUsernames();

setInterval(updateUsers, 10000);
setInterval(fetchModerators, 30000);
setInterval(updateTwitchUsernames, 60000);
setInterval(updateDiscordUsernames, 60000);
setInterval(updateLiveChannels, 15000);