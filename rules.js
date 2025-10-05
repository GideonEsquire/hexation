// rules.js
import { dirs, inBounds, isCenter, isPerimeter, RADIUS } from "./geometry.js";
import { State, getPiece, setPiece, MAX_STACK } from "./state.js";

export function legalMovesFrom(q, r) {
  const piece = getPiece(q, r);
  if (!piece || piece.side !== State.turn) return [];
  const moves = [];

  if (piece.type === "Q") {
    // Queen: budget = 1, but may jump over any number of friendlies at zero cost.
    for (const d of dirs) {
      for (let step = 1; ; step++) {
        const q2 = q + d.q * step,
          r2 = r + d.r * step;
        if (!inBounds(q2, r2)) break;

        const occ = getPiece(q2, r2);
        if (!occ) {
          // First non-friendly encountered is EMPTY -> can land here (cost 1 of 1)
          moves.push({ to: { q: q2, r: r2 } });
          break; // queen has only 1 landing budget
        }
        if (occ.side === piece.side) {
          // Friendly: free jump; keep scanning
          continue;
        }
        // Enemy: can capture (cost 1 of 1), but cannot go beyond
        moves.push({ to: { q: q2, r: r2 } });
        break;
      }
    }
    return moves;
  }

  if (piece.type === "D") {
    // Drone: can move up to `size` spaces through EMPTY/enemy cells.
    // NEW: May pass over FRIENDLY pieces at zero cost (cannot land on them).
    const maxSteps = Math.max(1, piece.size || 1);

    for (const d of dirs) {
      let cost = 0; // counts only empty steps and the final capture step

      for (let step = 1 /* unbounded until blocked */; ; step++) {
        const q2 = q + d.q * step;
        const r2 = r + d.r * step;
        if (!inBounds(q2, r2)) break;

        const occ = getPiece(q2, r2);

        if (!occ) {
          // Empty hex: costs 1 of the budget
          if (cost + 1 <= maxSteps) {
            moves.push({ to: { q: q2, r: r2 } });
            cost += 1;
            // keep scanning further along this ray
            continue;
          } else {
            // out of budget
            break;
          }
        }

        if (occ.side === piece.side) {
          // Friendly piece: free jump (cannot land), do NOT increase cost
          // keep scanning further along this ray
          continue;
        }

        // Enemy piece: capture allowed if we have 1 cost left; cannot pass beyond
        if (cost + 1 <= maxSteps) {
          moves.push({ to: { q: q2, r: r2 } });
        }
        break; // stop after first enemy either way
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
  const captured = getPiece(move.to.q, move.to.r); // may be null

  setPiece(move.to.q, move.to.r, src);
  setPiece(from.q, from.r, null);

  if (captured && captured.type === "Q") {
    State.winner = moverSide;
    return;
  }

  const landed = getPiece(move.to.q, move.to.r);
  if (landed && landed.type === "D" && isCenter(move.to.q, move.to.r)) {
    const newSize =
      typeof landed.size === "number"
        ? Math.max(landed.size, MAX_STACK)
        : MAX_STACK;
    setPiece(move.to.q, move.to.r, { ...landed, size: newSize });
  }

  const center = getPiece(0, 0);
  if (center && center.type === "Q") {
    const queenSide = center.side;

    if (State.centerClaimOwner === queenSide) {
      if (moverSide !== queenSide) {
        State.winner = queenSide;
        return;
      }
    } else {
      State.centerClaimOwner = queenSide;
    }
  } else {
    State.centerClaimOwner = null;
  }

  const hasW = [...State.pieces.values()].some((p) => p.side === "W");
  const hasB = [...State.pieces.values()].some((p) => p.side === "B");
  if (!hasW) {
    State.winner = "B";
    return;
  }
  if (!hasB) {
    State.winner = "W";
    return;
  }
}
