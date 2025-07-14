import WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 3000 });
const rooms = {};

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        let parsed;
        try {
            parsed = JSON.parse(message);
        } catch {
            console.error('Invalid JSON:', message);
            return;
        }

        if (parsed.type === 'join') {
            let room = rooms[parsed.room] || (rooms[parsed.room] = []);
            room.push(ws);
            ws.room = parsed.room;
            ws.playerId = room.length;
            ws.send(JSON.stringify({ type: 'player_id', id: ws.playerId }));
            broadcastRoom(ws.room, {
                type: 'status',
                message: `Player ${ws.playerId} joined.`
            });
        }

        if (parsed.type === 'game_action' && ws.room) {
            broadcastRoom(ws.room, {
                type: 'game_action',
                from: ws.playerId,
                action: parsed.action,
                payload: parsed.payload,
            }, ws);
        }
    });

    ws.on('close', () => {
        if (!ws.room) return;
        rooms[ws.room] = rooms[ws.room].filter(player => player !== ws);
        broadcastRoom(ws.room, {
            type: 'status',
            message: `A player disconnected.`,
        });
    });
});

function broadcastRoom(roomName, message, excludeWs = null) {
    const room = rooms[roomName];
    if (!room) return;
    room.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN && ws !== excludeWs) {
            ws.send(JSON.stringify(message));
        }
    });
}

console.log('✅ WebSocket server running on ws://localhost:3000');
