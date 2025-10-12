let ws,
  sid = null,
  room = null,
  connected = false;
const listeners = new Set();

const BACKEND_WS =
  window.__WS_URL__ ||
  `wss://${new URLSearchParams(location.search).get("ws") || "hexation-backend.fly.dev"}/ws`;

export function onNet(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function send(m) {
  if (connected) ws.send(JSON.stringify(m));
}

export function connect(url) {
  const ws = new WebSocket(BACKEND_WS);
  ws = new WebSocket(url);
  ws.onopen = () => {
    connected = true;
    send({ t: "hello", client: "hexation-web", v: 7 });
  };
  ws.onclose = () => {
    connected = false;
  };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.t === "welcome") sid = m.sid;
    listeners.forEach((fn) => fn(m));
  };
}

export function createRoom(players = 2) {
  send({ t: "create", players });
}
export function joinRoom(code, name) {
  send({ t: "join", room: code, name });
}
export function sendMove(from, to) {
  send({ t: "move", from, to });
}
export function placeQueen(to) {
  send({ t: "place_queen", to });
}
export function placeDrone(to) {
  send({ t: "place_drone", to });
}
export function togglePlace(on) {
  send({ t: "toggle_place_mode", on });
}
