// rules.js
import { dirs, inBounds, isCenter, isPerimeter } from "./geometry.js";
import { State, getPiece, setPiece, MAX_STACK } from "./state.js";

export function legalMovesFrom(q, r) {
  const piece = getPiece(q, r);
  if (!piece || piece.side !== State.turn) return [];
  const moves = [];

  if (piece.type === "Q") {
    for (const d of dirs) {
      const q2 = q + d.q,
        r2 = r + d.r;
      if (!inBounds(q2, r2)) continue;
      const occ = getPiece(q2, r2);
      if (!occ || occ.side !== piece.side) moves.push({ to: { q: q2, r: r2 } });
    }
  } else if (piece.type === "D") {
    const maxSteps = Math.max(1, piece.size || 1);
    for (const d of dirs) {
      for (let step = 1; step <= maxSteps; step++) {
        const q2 = q + d.q * step,
          r2 = r + d.r * step;
        if (!inBounds(q2, r2)) break;
        const occ = getPiece(q2, r2);
        if (!occ) moves.push({ to: { q: q2, r: r2 } });
        else {
          if (occ.side !== piece.side) moves.push({ to: { q: q2, r: r2 } });
          break;
        }
      }
    }
  }

  return moves;
}

export function legalPlacementHexes() {
  const spots = [];
  const side = State.turn;
  const P = State.placements[side];

  if (!P.queenPlaced) {
    for (let r = -5; r <= 5; r++)
      for (let q = -5; q <= 5; q++) {
        if (!inBounds(q, r) || !isPerimeter(q, r)) continue;
        if (!getPiece(q, r)) spots.push({ q, r, kind: "queen" });
      }
    return spots;
  }

  if (!State.placeMode) return spots;

  for (let r = -5; r <= 5; r++)
    for (let q = -5; q <= 5; q++) {
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
