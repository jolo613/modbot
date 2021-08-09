global.client = {};

// Load Discord Module
require("./discord/discord");

// Load Twitch Module
require("./twitch/twitch");

// Load Express Backend
require("./backend/express");

// Load global intervals
const updateUsers = require("./interval/updateUsers");

updateUsers();

setInterval(updateUsers, 30000);