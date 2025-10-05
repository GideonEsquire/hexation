// main.js
import {
  RADIUS,
  HEX_SIZE,
  pixelToAxial,
  axialToPixel,
  inBounds,
  isPerimeter,
} from "./geometry.js";
import {
  State,
  resetState,
  getPiece,
  setPiece,
  remainingDrones,
} from "./state.js";
import { legalMovesFrom, applyMove } from "./rules.js";
import { drawFrame } from "./render.js";
import { updateTurnUI, elResetBtn, placeBtnW, placeBtnB } from "./ui.js";

// Helper: is placing mode from UI toggle
function isPlaceIntent() {
  return !!State.placeMode;
}

let canvasW, canvasH, centerX, centerY;

function switchTurn() {
  State.turn = State.turn === "W" ? "B" : "W";
  State.placeMode = false;
}

function mouseToAxial() {
  const localX = mouseX - centerX;
  const localY = mouseY - centerY;
  const { q, r } = pixelToAxial(localX, localY);
  return inBounds(q, r) ? { q, r } : null;
}

function redrawAll() {
  updateTurnUI(State);
  redraw();
}

// p5 global hooks must be attached to window when using ES modules
window.setup = function setup() {
  canvasW = Math.max(720, Math.min(window.innerWidth, 1200));
  canvasH = Math.max(640, Math.min(window.innerHeight, 1000));
  createCanvas(canvasW, canvasH);

  centerX = width / 2;
  centerY = height / 2;

  resetState();
  noLoop();
  redrawAll();
};

window.windowResized = function windowResized() {
  canvasW = Math.max(720, Math.min(window.innerWidth, 1200));
  canvasH = Math.max(640, Math.min(window.innerHeight, 1000));
  resizeCanvas(canvasW, canvasH);
  centerX = width / 2;
  centerY = height / 2;
  redrawAll();
};

window.draw = function draw() {
  drawFrame(State, centerX, centerY, RADIUS);

  // hover ring
  const a = mouseToAxial();
  if (a) {
    const { x, y } = axialToPixel(a.q, a.r);
    push();
    translate(centerX + x, centerY + y);
    noFill();
    stroke("#5e81ac");
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 180) * (60 * i - 30);
      vertex(HEX_SIZE * 0.9 * Math.cos(ang), HEX_SIZE * 0.9 * Math.sin(ang));
    }
    endShape(CLOSE);
    pop();
  }
};

window.mousePressed = function mousePressed() {
  if (State.winner) return;
  const a = mouseToAxial();
  if (!a) return;

  const P = State.placements[State.turn];
  const occ = getPiece(a.q, a.r);

  // toggle selection if clicking the already-selected piece ---
  if (State.selected && State.selected.q === a.q && State.selected.r === a.r) {
    State.selected = null;
    State.legalMoves = [];
    // don't change placeMode or turn; just clear highlights
    redrawAll();
    return;
  }
  if (!P.queenPlaced) {
    if (!isPerimeter(a.q, a.r) || occ) return;
    setPiece(a.q, a.r, { side: State.turn, type: "Q", size: 1 });
    P.queenPlaced = true;
    State.selected = null;
    State.legalMoves = [];
    switchTurn();
    redrawAll();
    return;
  }

  if (
    isPlaceIntent() &&
    remainingDrones(State.turn) > 0 &&
    isPerimeter(a.q, a.r)
  ) {
    const occ2 = getPiece(a.q, a.r);
    if (!occ2) {
      setPiece(a.q, a.r, { side: State.turn, type: "D", size: 1 });
      State.placements[State.turn].dronesPlaced += 1;
      switchTurn();
      redrawAll();
      return;
    } else if (occ2.side === State.turn && occ2.type === "D") {
      const MAX_STACK = 5;
      const next = Math.min(MAX_STACK, (occ2.size || 1) + 1);
      if (next > (occ2.size || 1)) {
        setPiece(a.q, a.r, { ...occ2, size: next });
        State.placements[State.turn].dronesPlaced += 1;
        switchTurn();
        redrawAll();
        return;
      }
    }
  }

  if (State.selected) {
    const mv = State.legalMoves.find((m) => m.to.q === a.q && m.to.r === a.r);
    if (mv) {
      applyMove(State.selected, mv);
      State.selected = null;
      State.legalMoves = [];
      if (!State.winner) switchTurn();
      redrawAll();
      return;
    }
    if (occ && occ.side === State.turn) {
      State.selected = { q: a.q, r: a.r };
      State.legalMoves = legalMovesFrom(a.q, a.r);
      redrawAll();
      return;
    }
    State.selected = null;
    State.legalMoves = [];
    redrawAll();
    return;
  }

  if (occ && occ.side === State.turn) {
    State.selected = { q: a.q, r: a.r };
    State.legalMoves = legalMovesFrom(a.q, a.r);
    redrawAll();
    return;
  }
};

// UI events
elResetBtn.addEventListener("click", () => {
  resetState();
  redrawAll();
  document.getElementById("resetWrap").style.display = "none";
});

placeBtnW.addEventListener("click", () => {
  const P = State.placements.W;
  if (
    State.turn !== "W" ||
    !P.queenPlaced ||
    remainingDrones("W") === 0 ||
    State.winner
  )
    return;
  State.placeMode = !State.placeMode;
  redrawAll();
});

placeBtnB.addEventListener("click", () => {
  const P = State.placements.B;
  if (
    State.turn !== "B" ||
    !P.queenPlaced ||
    remainingDrones("B") === 0 ||
    State.winner
  )
    return;
  State.placeMode = !State.placeMode;
  redrawAll();
});
