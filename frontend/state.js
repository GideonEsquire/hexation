// state.js
export const DRONES_PER_SIDE = 6;
export const MAX_STACK = 5;

// Up to 6 players. Tweak names/colors as you like.
export const DEFAULT_PLAYERS = [
  {
    id: "P1",
    name: "White",
    fill: "#eceff4",
    stroke: "#2e3440",
    jingleBase: 440,
  },
  {
    id: "P2",
    name: "Black",
    fill: "#3b4252",
    stroke: "#d8dee9",
    jingleBase: 392,
  },
  {
    id: "P3",
    name: "Cyan",
    fill: "#88c0d0",
    stroke: "#2e3440",
    jingleBase: 523.25,
  },
  {
    id: "P4",
    name: "Green",
    fill: "#a3be8c",
    stroke: "#2e3440",
    jingleBase: 493.88,
  },
  {
    id: "P5",
    name: "Gold",
    fill: "#ebcb8b",
    stroke: "#2e3440",
    jingleBase: 329.63,
  },
  {
    id: "P6",
    name: "Violet",
    fill: "#b48ead",
    stroke: "#2e3440",
    jingleBase: 261.63,
  },
];

function mkPlacements(players) {
  const o = {};
  for (const p of players)
    o[p.id] = { queenPlaced: false, dronesPlaced: 0, active: true };
  return o;
}

export const State = {
  players: DEFAULT_PLAYERS.slice(0, 2), // start as 2p; set to 3..6 later
  turnIndex: 0, // rotates over active players
  pieces: new Map(), // "q,r" -> { side: playerId, type:'Q'|'D', size:number }
  selected: null,
  legalMoves: [],
  centerClaimOwner: null, // playerId | null
  centerClaimAnchorTurn: null, // turnIndex when claim (owner’s own turn index)
  winner: null, // playerId | null
  placeMode: false,
  placements: mkPlacements(DEFAULT_PLAYERS.slice(0, 2)),
};

export function resetState() {
  State.pieces.clear();
  State.selected = null;
  State.legalMoves = [];
  State.turnIndex = 0;
  State.centerClaimOwner = null;
  State.centerClaimAnchorTurn = null;
  State.winner = null;
  State.placeMode = false;
  State.placements = mkPlacements(State.players);
}

export function setPlayerCount(n) {
  const k = Math.max(2, Math.min(6, n));
  State.players = DEFAULT_PLAYERS.slice(0, k).map((p) => ({ ...p }));
  resetState();
}

export function currentPlayer() {
  return State.players[State.turnIndex];
}

export function rotateTurn() {
  const N = State.players.length;
  for (let i = 1; i <= N; i++) {
    const idx = (State.turnIndex + i) % N;
    const pid = State.players[idx].id;
    if (State.placements[pid]?.active !== false) {
      State.turnIndex = idx;
      return;
    }
  }
}

export function remainingDrones(sideId) {
  const P = State.placements[sideId];
  return Math.max(0, DRONES_PER_SIDE - (P?.dronesPlaced || 0));
}

export function coordKey(q, r) {
  return `${q},${r}`;
}

export function getPiece(q, r) {
  return State.pieces.get(coordKey(q, r)) || null;
}

export function setPiece(q, r, p) {
  if (p) State.pieces.set(coordKey(q, r), p);
  else State.pieces.delete(coordKey(q, r));
}

export const Celebration = {
  active: false,
  t0: 0,
  duration: 1800,
  origin: { q: 0, r: 0 },
};

export function startCelebration(q = 0, r = 0) {
  Celebration.active = true;
  Celebration.t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  Celebration.origin = { q, r };
}

export function findQueen(sideId) {
  for (const [key, p] of State.pieces.entries()) {
    if (p.type === "Q" && p.side === sideId) {
      const [qStr, rStr] = key.split(",");
      return { q: +qStr, r: +rStr };
    }
  }
  return null;
}
