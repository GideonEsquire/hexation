import { dirs, inBounds, isCenter, isPerimeter, RADIUS } from "./geometry.js";
import { SFX } from "./sounds.js";
import {
  State,
  getPiece,
  setPiece,
  MAX_STACK,
  startCelebration,
  findQueen,
} from "./state.js";

export function legalMovesFrom(q, r) {
  const piece = getPiece(q, r);
  if (!piece || piece.side !== State.turn) return [];
  const moves = [];

  if (piece.type === "Q") {
    // Queen: budget = 1; free-jump over friendlies; land on first empty/enemy.
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

        // enemy: label green if it's the queen, else default
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
    const maxSteps = mySize;

    for (const d of dirs) {
      let cost = 0; // spend only on landing (empty/capture/merge)

      for (let step = 1; ; step++) {
        const q2 = q + d.q * step,
          r2 = r + d.r * step;
        if (!inBounds(q2, r2)) break;

        const occ = getPiece(q2, r2);
        if (!occ) {
          if (cost + 1 <= maxSteps) {
            moves.push({ to: { q: q2, r: r2 }, kind: "default" });
            cost += 1;
            continue;
          }
          break;
        }

        if (occ.side === piece.side) {
          if (occ.type === "D") {
            // merge allowed if sizes fit; costs 1
            const occSize = Math.max(1, occ.size || 1);
            const sum = mySize + occSize;
            if (sum <= MAX_STACK && cost + 1 <= maxSteps) {
              moves.push({
                to: { q: q2, r: r2 },
                kind: "drone-stack", // <- yellow like placement "drone-stack"
                merge: true, // optional flag for debugging
              });
            }
          }
          // friendlies are free to jump over; keep scanning
          continue;
        }

        // enemy: capture if budget allows; green if capturing queen, else default
        if (cost + 1 <= maxSteps) {
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
  const side = State.turn;
  const P = State.placements[side];

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
        occ.side === side &&
        occ.type === "D" &&
        (occ.size || 1) < MAX_STACK
      )
        spots.push({ q, r, kind: "drone-stack" });
    }
  return spots;
}

export function applyMove(from, move) {
  const src = getPiece(from.q, from.r);
  if (!src) return;

  const moverSide = src.side;
  const dst = getPiece(move.to.q, move.to.r); // may be null

  // --- Friendly-merge case (Drone onto friendly Drone) ---
  if (dst && dst.side === moverSide && src.type === "D" && dst.type === "D") {
    const srcSize = Math.max(1, src.size || 1);
    const dstSize = Math.max(1, dst.size || 1);
    const sum = srcSize + dstSize;

    // This should always be true because legalMovesFrom guards it,
    // but we keep the check for safety.
    if (sum <= MAX_STACK) {
      // Merge stacks
      setPiece(move.to.q, move.to.r, { ...dst, size: sum });
      setPiece(from.q, from.r, null);

      // Center upgrade still applies after merge
      const landed = getPiece(move.to.q, move.to.r);
      if (landed && landed.type === "D" && isCenter(move.to.q, move.to.r)) {
        setPiece(move.to.q, move.to.r, { ...landed, size: MAX_STACK });
      }
    }
    // No queen claim/capture logic needed here; fall through to post-processing
  }
  // --- Capture or move into empty (or enemy) ---
  else {
    setPiece(move.to.q, move.to.r, src);
    SFX.move();
    console.log("sound");
    setPiece(from.q, from.r, null);

    // Queen capture is sudden death
    if (dst && dst.type === "Q" && dst.side !== moverSide) {
      State.winner = moverSide;
      const qpos = findQueen(moverSide);
      if (qpos) startCelebration(qpos.q, qpos.r);
      else startCelebration(0, 0); // fallback
      SFX.win(moverSide);
      return;
    }

    // Center upgrade (drone reaching center becomes MAX_STACK)
    const landed = getPiece(move.to.q, move.to.r);
    if (landed && landed.type === "D" && isCenter(move.to.q, move.to.r)) {
      setPiece(move.to.q, move.to.r, { ...landed, size: MAX_STACK });
    }
  }

  // --- Center claim/hold logic for queens (unchanged) ---
  const center = getPiece(0, 0);
  if (center && center.type === "Q") {
    const queenSide = center.side;

    if (State.centerClaimOwner === queenSide) {
      // If the mover was the opponent and the claim still stands after their turn -> win now.
      if (moverSide !== queenSide) {
        State.winner = queenSide;
        // The winning queen is on center by rule, but we still look it up for consistency
        const qpos = findQueen(queenSide) || { q: 0, r: 0 };
        startCelebration(qpos.q, qpos.r);
        if (qpos) startCelebration(qpos.q, qpos.r);
        else startCelebration(0, 0); // fallback
        SFX.win(moverSide);
        return;
      }
    } else {
      // New (or switched) claim
      State.centerClaimOwner = queenSide;
    }
  } else {
    State.centerClaimOwner = null;
  }

  // Optional fallback elimination rule (unchanged)
  const hasW = [...State.pieces.values()].some((p) => p.side === "W");
  const hasB = [...State.pieces.values()].some((p) => p.side === "B");
  if (!hasW) {
    State.winner = "B";
    const qpos = findQueen(moverSide);
    if (qpos) startCelebration(qpos.q, qpos.r);
    else startCelebration(0, 0); // fallback
    SFX.win(moverSide);
    return;
  }
  if (!hasB) {
    State.winner = "W";
    const qpos = findQueen(moverSide);
    if (qpos) startCelebration(qpos.q, qpos.r);
    else startCelebration(0, 0); // fallback
    SFX.win(moverSide);
    return;
  }
}
