
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

const parties = new Map();

wss.on("connection", (ws) => {
    let partyCode = null;

    ws.on("message", (message) => {
        let data;

        try {
            data = JSON.parse(message);
        } catch {
            return;
        }

        if (data.type === "join") {
            partyCode = data.code;

            if (!parties.has(partyCode)) {
                parties.set(partyCode, new Set());
            }

            parties.get(partyCode).add(ws);

            broadcast(partyCode, {
                type: "system",
                message: "Someone joined the party."
            }, ws);
        }

        if (data.type === "chat") {
            broadcast(partyCode, {
                type: "chat",
                message: data.message
            });
        }

        if (data.type === "signal") {
            broadcast(partyCode, {
                type: "signal",
                signal: data.signal
            }, ws);
        }

        if (data.type === "screen-share-started") {
            broadcast(partyCode, {
                type: "screen-share-started"
            }, ws);
        }
    });

    ws.on("close", () => {
        if (partyCode && parties.has(partyCode)) {
            parties.get(partyCode).delete(ws);

            if (parties.get(partyCode).size === 0) {
                parties.delete(partyCode);
            }
        }
    });
});

function broadcast(code, message, exclude = null) {
    const party = parties.get(code);

    if (!party) return;

    for (const client of party) {
        if (
            client !== exclude &&
            client.readyState === WebSocket.OPEN
        ) {
            client.send(JSON.stringify(message));
        }
    }
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Watch Party running on port ${PORT}`);
});
