import http from "node:http";
import { WebSocketServer } from "ws";
import { nanoid } from "nanoid";

// --- in-memory rooms (start simple) ---
const rooms = new Map(); // roomId -> { players: Map<sid,{ws, pid, name}>, state: {...} }

function mkPatch(state) {
  // TODO: compute minimal patch; start with full state:
  return { reset: false, ...state };
}

function broadcast(room, msg) {
  const data = JSON.stringify(msg);
  for (const { ws } of room.players.values()) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

// very small state scaffold; replace with your ported rules/state
function newState() {
  return {
    players: [{ id: "P1", name: "White" }, { id: "P2", name: "Black" }],
    turnIndex: 0,
    pieces: {}, // "q,r": { side, type, size }
    winner: null,
  };
}

function createRoom(seats = 2) {
  const id = nanoid(4).toUpperCase();
  rooms.set(id, { id, seats, players: new Map(), state: newState() });
  return rooms.get(id);
}

// --- HTTP (health) ---
const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  if (req.url === "/health") { res.writeHead(200); res.end("ok"); return; }
  res.writeHead(200, {"content-type":"text/plain"}); res.end("hexation ws");
});

// --- WebSocket ---
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws) => {
  const sid = "sess_" + nanoid(8);
  ws.send(JSON.stringify({ t: "welcome", sid, room: null }));

  let room = null;
  ws.on("message", (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }

    if (m.t === "hello") {
      ws.send(JSON.stringify({ t: "ack", v: m.v ?? 1 }));
    }

    if (m.t === "create") {
      const seats = Math.max(2, Math.min(6, parseInt(m.players || 2,10)));
      room = createRoom(seats);
      const pid = "P1"; // first joiner -> P1 (improve as needed)
      room.players.set(sid, { ws, pid, name: m.name || pid });
      ws.send(JSON.stringify({ t:"room", id: room.id, seats: room.seats, you: pid }));
      ws.send(JSON.stringify({ t:"state", patch: mkPatch(room.state) }));
    }

    if (m.t === "join") {
      const r = rooms.get(String(m.room || "").toUpperCase());
      if (!r) return ws.send(JSON.stringify({ t:"error", code:"NO_SUCH_ROOM" }));
      room = r;
      // assign next available P#
      const taken = new Set([...r.players.values()].map(p => p.pid));
      let pid = null;
      for (let i=1;i<=r.seats;i++){ const id="P"+i; if(!taken.has(id)){ pid=id; break; } }
      if (!pid) return ws.send(JSON.stringify({ t:"error", code:"ROOM_FULL" }));
      r.players.set(sid, { ws, pid, name: m.name || pid });

      ws.send(JSON.stringify({ t:"room", id: r.id, seats: r.seats, you: pid }));
      ws.send(JSON.stringify({ t:"state", patch: mkPatch(r.state) }));
    }

    if (m.t === "move" || m.t === "place_queen" || m.t === "place_drone") {
      if (!room) return;
      // TODO: validate with your rules; for now just echo error if not implemented:
      // room.state = applyAction(room.state, m) -> returns new state + patch
      ws.send(JSON.stringify({ t:"error", code:"NOT_IMPLEMENTED" }));
    }

    if (m.t === "ping") ws.send(JSON.stringify({ t:"pong", id: m.id }));
  });

  ws.on("close", () => {
    if (!room) return;
    room.players.delete(sid);
    if (room.players.size === 0) {
      // Optionally tear down empty rooms after a timeout
      // rooms.delete(room.id);
    }
  });
});

server.on("upgrade", (req, socket, head) => {
  if (req.url !== "/ws") { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

server.listen(PORT, () => console.log("WS on", PORT));
