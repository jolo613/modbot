const WebSocketServer = require("ws").Server;
const config = require("../config.json");

const {SessionService, IdentityService} = require("../api");

function noop() {}

function heartbeat() {
    this.isAlive = true;
}

const wss = new WebSocketServer({
    port: config.websocket.port,
});

global.websocket = {
    wss: wss,
    emit: (query, data) => {
        if (query.hasOwnProperty("identityId")) {
            console.log("emitting", data);
            wss.clients.forEach(ws => {
                if (ws.identity?.id == query.identityId) {
                    console.log("emitting...");
                    ws.json(data);
                }
            })
        }
    },
}


let listeners = {
    auth: (ws, json, reply) => {
        SessionService.resolveSession(json.session).then(session => {
            IdentityService.resolveIdentity(session.identity_id).then(identity => {
                ws.identity = identity;
                reply({success: true, identity: identity});
            }).catch(err => {
                reply({success: false, error: err});
            });
        }).catch(err => {
            reply({success: false, error: err});
        });
        
    }
};


wss.on('connection', ws => {
    ws.isAlive = true;
    ws.on("pong", heartbeat);

    ws.json = object => {
        ws.send(JSON.stringify(object));
    };

    ws.on("message", (message) => {
        try {
            let json = JSON.parse(message.toString());

            if (json.hasOwnProperty("type") && listeners.hasOwnProperty(json.type)) {
                if (json.hasOwnProperty("trace")) {
                    listeners[json.type](ws, json, object => {
                        object.trace = json.trace;
                        ws.json(object);
                    });
                } else {
                    ws.json({success: false, error: "Message sent without Trace ID"});
                }
            }
        } catch(err) {
            ws.json({success: false, error: "Could not parse JSON data"});
        }
    });
});

// Keep alive code.
const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping(noop);
    });
}, 30000);

wss.on('close', function close() {
    clearInterval(interval);
});