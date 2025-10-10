// rules.js
import { dirs, inBounds, isCenter, isPerimeter, RADIUS } from "./geometry.js";
import { SFX } from "./sounds.js";
import {
  State,
  getPiece,
  setPiece,
  MAX_STACK,
  startCelebration,
  findQueen,
  currentPlayer,
  rotateTurn,
  remainingDrones,
} from "./state.js";

export function legalMovesFrom(q, r) {
  const piece = getPiece(q, r);
  const me = currentPlayer().id;
  if (!piece || piece.side !== me) return [];
  const moves = [];

  if (piece.type === "Q") {
    for (const d of dirs) {
      for (let step = 1; ; step++) {
        const q2 = q + d.q * step,
          r2 = r + d.r * step;
        if (!inBounds(q2, r2)) break;
        const occ = getPiece(q2, r2);
        if (!occ) {
          moves.push({ to: { q: q2, r: r2 }, kind: "default" });
          break;
        }
        if (occ.side === piece.side) continue;
        moves.push({
          to: { q: q2, r: r2 },
          kind: occ.type === "Q" ? "queen" : "default",
        });
        break;
      }
    }
    return moves;
  }

  if (piece.type === "D") {
    const mySize = Math.max(1, piece.size || 1);
    for (const d of dirs) {
      let cost = 0;
      for (let step = 1; ; step++) {
        const q2 = q + d.q * step,
          r2 = r + d.r * step;
        if (!inBounds(q2, r2)) break;
        const occ = getPiece(q2, r2);
        if (!occ) {
          if (cost + 1 <= mySize) {
            moves.push({ to: { q: q2, r: r2 }, kind: "default" });
            cost += 1;
            continue;
          }
          break;
        }
        if (occ.side === piece.side) {
          if (occ.type === "D") {
            const occSize = Math.max(1, occ.size || 1);
            if (occSize + mySize <= MAX_STACK && cost + 1 <= mySize) {
              moves.push({
                to: { q: q2, r: r2 },
                kind: "drone-stack",
                merge: true,
              });
            }
          }
          continue;
        }
        if (cost + 1 <= mySize) {
          moves.push({
            to: { q: q2, r: r2 },
            kind: occ.type === "Q" ? "queen" : "default",
          });
        }
        break;
      }
    }
    return moves;
  }

  return moves;
}

export function legalPlacementHexes() {
  const spots = [];
  const me = currentPlayer().id;
  const P = State.placements[me];

  if (!P.queenPlaced) {
    for (let r = -RADIUS; r <= RADIUS; r++)
      for (let q = -RADIUS; q <= RADIUS; q++) {
        if (!inBounds(q, r) || !isPerimeter(q, r)) continue;
        if (!getPiece(q, r)) spots.push({ q, r, kind: "queen" });
      }
    return spots;
  }

  if (!State.placeMode) return spots;

  for (let r = -RADIUS; r <= RADIUS; r++)
    for (let q = -RADIUS; q <= RADIUS; q++) {
      if (!inBounds(q, r) || !isPerimeter(q, r)) continue;
      const occ = getPiece(q, r);
      if (!occ) spots.push({ q, r, kind: "drone-empty" });
      else if (
        occ.side === me &&
        occ.type === "D" &&
        (occ.size || 1) < MAX_STACK
      )
        spots.push({ q, r, kind: "drone-stack" });
    }
  return spots;
}

function eliminatePlayer(sideId) {
  if (!State.placements[sideId]) return;
  State.placements[sideId].active = false;
  // Optional: leave their pieces on board until captured; or remove now:
  // for (const [k,p] of [...State.pieces]) if (p.side===sideId) State.pieces.delete(k);
}

function activePlayerCount() {
  return State.players.filter((p) => State.placements[p.id]?.active !== false)
    .length;
}

function maybeResolveCenterHold(moverId) {
  const c = getPiece(0, 0);
  if (c && c.type === "Q" && State.placements[c.side]?.active !== false) {
    if (State.centerClaimOwner === c.side) {
      // If a full round passed and we're back to the owner's turn → win for owner.
      const ownersIndex = State.players.findIndex((p) => p.id === c.side);
      if (State.turnIndex === ownersIndex) {
        State.winner = c.side;
        const qpos = findQueen(c.side) || { q: 0, r: 0 };
        startCelebration(qpos.q, qpos.r);
        SFX.win(); // variant selection optional
      }
    } else {
      State.centerClaimOwner = c.side;
      // Anchor at the moment of claim; we’ll check when the turn cycles back.
      State.centerClaimAnchorTurn = State.turnIndex;
    }
  } else {
    State.centerClaimOwner = null;
    State.centerClaimAnchorTurn = null;
  }
}

export function applyMove(from, move) {
  const src = getPiece(from.q, from.r);
  if (!src) return;
  const me = src.side;
  const dst = getPiece(move.to.q, move.to.r);

  // Friendly merge
  if (dst && dst.side === me && src.type === "D" && dst.type === "D") {
    const sum = Math.max(1, src.size || 1) + Math.max(1, dst.size || 1);
    if (sum <= MAX_STACK) {
      setPiece(move.to.q, move.to.r, { ...dst, size: sum });
      setPiece(from.q, from.r, null);
      const landed = getPiece(move.to.q, move.to.r);
      if (landed && landed.type === "D" && isCenter(move.to.q, move.to.r)) {
        setPiece(move.to.q, move.to.r, { ...landed, size: MAX_STACK });
      }
    }
  } else {
    // Move / capture
    setPiece(move.to.q, move.to.r, src);
    setPiece(from.q, from.r, null);

    // Queen capture → eliminate victim
    if (dst && dst.type === "Q" && dst.side !== me) {
      eliminatePlayer(dst.side);
      const alive = activePlayerCount();
      if (alive === 1) {
        State.winner = me;
        const qpos = findQueen(me) || { q: 0, r: 0 };
        startCelebration(qpos.q, qpos.r);
        SFX.win();
        return;
      }
    }

    // Center upgrade
    const landed = getPiece(move.to.q, move.to.r);
    if (landed && landed.type === "D" && isCenter(move.to.q, move.to.r)) {
      setPiece(move.to.q, move.to.r, { ...landed, size: MAX_STACK });
    }
  }

  // Center-hold check (after the move resolves, before rotating turn)
  maybeResolveCenterHold(me);
}
