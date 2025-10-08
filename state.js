export const DRONES_PER_SIDE = 6;
export const MAX_STACK = 5;

export const State = {
  pieces: new Map(), // "q,r" -> { side:'W'|'B', type:'Q'|'D', size:number }
  selected: null,
  legalMoves: [],
  turn: "W",
  centerClaimOwner: null, // 'W' | 'B' | null
  winner: null,
  placeMode: false,
  placements: {
    W: { queenPlaced: false, dronesPlaced: 0 },
    B: { queenPlaced: false, dronesPlaced: 0 },
  },
};

export function resetState() {
  State.pieces.clear();
  State.selected = null;
  State.legalMoves = [];
  State.turn = "W";
  State.centerClaimOwner = null;
  State.winner = null;
  State.placeMode = false;
  State.placements = {
    W: { queenPlaced: false, dronesPlaced: 0 },
    B: { queenPlaced: false, dronesPlaced: 0 },
  };
}

export function remainingDrones(side) {
  const P = State.placements[side];
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

// Add/replace your celebration block with:
export const Celebration = {
  active: false,
  t0: 0,
  duration: 1800, // ms
  origin: { q: 0, r: 0 }, // where rings emit from
};

export function startCelebration(q = 0, r = 0) {
  Celebration.active = true;
  Celebration.t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  Celebration.origin = { q, r };
}

// Helper to locate a side's queen on the board
export function findQueen(side) {
  for (const [key, p] of State.pieces.entries()) {
    if (p.type === "Q" && p.side === side) {
      const [qStr, rStr] = key.split(",");
      return { q: parseInt(qStr, 10), r: parseInt(rStr, 10) };
    }
  }
  return null;
}
