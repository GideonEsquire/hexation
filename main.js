import {
  RADIUS,
  HEX_SIZE,
  pixelToAxial,
  axialToPixel,
  inBounds,
  isPerimeter,
  setHexSize,
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

export let droneFont;

// Compute HEX_SIZE so the whole board fits with padding on any screen
function computeHexSize() {
  // Board “diameter” in hexes (pointy top): approx 2*RADIUS + 1 rows; width ~ (2*R+1)*sqrt(3)/2
  // We'll pick a size that fits both width and height with margin.
  const w = window.innerWidth;
  const h = window.innerHeight;
  const margin = Math.min(w, h) * 0.08; // 8% padding
  const availW = w - margin * 2;
  const availH = h - margin * 2;

  // Pixel extent of board for HEX_SIZE = 1:
  // width1 ≈ sqrt(3) * (2R + 1) - sqrt(3)/2 * R   (safe upper bound)
  // height1 ≈ 1.5 * (2R + 1)
  const width1 = Math.sqrt(3) * (2 * RADIUS + 1);
  const height1 = 1.5 * (2 * RADIUS + 1);

  // pick the limiting dimension
  const sizeByW = availW / width1;
  const sizeByH = availH / height1;
  const hex = Math.floor(Math.min(sizeByW, sizeByH));

  // keep it reasonable
  const clamped = Math.max(22, Math.min(hex, 52));
  setHexSize(clamped);
}

function configureCanvas() {
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  resizeCanvas(canvasW, canvasH);
  centerX = width / 2;
  centerY = height / 2;
}

// p5 hooks
window.setup = async function setup() {
  droneFont = await loadFont("fonts/AF.ttf");
  // Clamp pixel density for performance on high-DPR phones
  const dpr = window.devicePixelRatio || 1;
  pixelDensity(Math.min(2, dpr)); // crisp but not memory hungry

  computeHexSize();
  createCanvas(window.innerWidth, window.innerHeight);
  configureCanvas();

  resetState();
  noLoop();
  updateTurnUI(State);
  redraw();
};

window.windowResized = function windowResized() {
  computeHexSize();
  configureCanvas();
  updateTurnUI(State);
  // redrawing next frame is safest in p5 v2
  requestAnimationFrame(redraw);
};

// Map touch to mouse, so mobile taps work everywhere
window.touchStarted = function touchStarted() {
  // Prevent accidental page scroll if touch starts on canvas
  if (mousePressed) mousePressed();
  return false; // prevent default
};
window.touchEnded = function touchEnded() {
  // Nothing special, but you can forward to mouseReleased if you add it
  return false;
};

// // p5 global hooks must be attached to window when using ES modules
// window.setup = async function setup() {
//   droneFont = await loadFont("fonts/AF.ttf");
//   canvasW = Math.max(720, Math.min(window.innerWidth, 1200));
//   canvasH = Math.max(640, Math.min(window.innerHeight, 1000));
//   createCanvas(canvasW, canvasH);
//
//   centerX = width / 2;
//   centerY = height / 2;
//
//   resetState();
//   noLoop();
//   redrawAll();
// };
//
// window.windowResized = function windowResized() {
//   canvasW = Math.max(720, Math.min(window.innerWidth, 1200));
//   canvasH = Math.max(640, Math.min(window.innerHeight, 1000));
//   resizeCanvas(canvasW, canvasH);
//   centerX = width / 2;
//   centerY = height / 2;
//   redrawAll();
// };

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
