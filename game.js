/* === Initial setup === */
function setupPosition() {
  State.pieces.clear();
  State.turn = "W";
  State.selected = null;
  State.legalMoves = [];
  State.winner = null;
  State.centerClaimOwner = null;
  State.placements = {
    W: { queenPlaced: false, dronesPlaced: 0 },
    B: { queenPlaced: false, dronesPlaced: 0 },
  };
  updateTurnUI();
}

/* === Turn handling === */
function switchTurn() {
  State.turn = State.turn === "W" ? "B" : "W";
  State.placeMode = false; // reset toggle each turn
  updateTurnUI();
}

/* === p5 sketch === */
let canvasW, canvasH, centerX, centerY;

function setup() {
  canvasW = Math.max(720, Math.min(window.innerWidth, 1200));
  canvasH = Math.max(640, Math.min(window.innerHeight, 1000));
  createCanvas(canvasW, canvasH);

  centerX = width / 2;
  centerY = height / 2;

  setupPosition();
  noLoop();
}

function windowResized() {
  canvasW = Math.max(720, Math.min(window.innerWidth, 1200));
  canvasH = Math.max(640, Math.min(window.innerHeight, 1000));
  resizeCanvas(canvasW, canvasH);
  centerX = width / 2;
  centerY = height / 2;
  redraw();
}
