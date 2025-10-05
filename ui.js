import { remainingDrones } from "./state.js";

export const elTurn = document.getElementById("turn");
export const elResetWrap = document.getElementById("resetWrap");
export const elResetBtn = document.getElementById("resetBtn");
export const placeBtnW = document.getElementById("placeW");
export const placeBtnB = document.getElementById("placeB");
export const elRemW = document.getElementById("remW");
export const elRemB = document.getElementById("remB");

export function updateTurnUI(State) {
  if (State.winner) {
    elTurn.textContent = State.winner === "W" ? "White wins" : "Black wins";
    if (elResetWrap) elResetWrap.style.display = "block";
  } else {
    const P = State.placements[State.turn];
    if (!P.queenPlaced)
      elTurn.textContent =
        (State.turn === "W" ? "White" : "Black") + " — place QUEEN";
    else if (remainingDrones(State.turn) > 0)
      elTurn.textContent =
        (State.turn === "W" ? "White" : "Black") + " — move OR place DRONE";
    else elTurn.textContent = State.turn === "W" ? "White" : "Black";
    if (elResetWrap) elResetWrap.style.display = "none";
  }

  elRemW.textContent = `(${remainingDrones("W")})`;
  elRemB.textContent = `(${remainingDrones("B")})`;

  const enableW =
    State.turn === "W" &&
    State.placements.W.queenPlaced &&
    remainingDrones("W") > 0 &&
    !State.winner;
  const enableB =
    State.turn === "B" &&
    State.placements.B.queenPlaced &&
    remainingDrones("B") > 0 &&
    !State.winner;

  placeBtnW.classList.toggle("disabled", !enableW);
  placeBtnB.classList.toggle("disabled", !enableB);

  placeBtnW.classList.toggle(
    "active",
    enableW && State.placeMode && State.turn === "W",
  );
  placeBtnB.classList.toggle(
    "active",
    enableB && State.placeMode && State.turn === "B",
  );
}
