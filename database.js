const config = require("./config.json");

const mysql      = require('mysql');
const connection = mysql.createConnection({
    host     : config.mysql.host,
    user     : config.mysql.user,
    password : config.mysql.password,
    database : config.mysql.database,
    charset: 'utf8mb4',
});
 
connection.connect();

module.exports = connection;