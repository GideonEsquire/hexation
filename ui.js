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

const helpBtn = document.getElementById("helpBtn");
const helpBackdrop = document.getElementById("helpBackdrop");
const helpDialog = document.getElementById("helpDialog");
const helpClose = document.getElementById("helpClose");

let lastFocused = null;

function openHelp() {
  if (!helpDialog) return;
  lastFocused = document.activeElement;
  helpBackdrop.classList.add("open");
  helpDialog.classList.add("open");
  helpBackdrop.setAttribute("aria-hidden", "false");
  // focus the dialog for screen readers & keyboard traps
  helpDialog.focus({ preventScroll: true });
  // stop canvas from stealing scroll on mobile
  document.body.style.overflow = "hidden";
}

function closeHelp() {
  helpBackdrop.classList.remove("open");
  helpDialog.classList.remove("open");
  helpBackdrop.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  // return focus to the last button
  if (lastFocused && lastFocused.focus) lastFocused.focus();
}

// click handlers
if (helpBtn) helpBtn.addEventListener("click", openHelp);
if (helpClose) helpClose.addEventListener("click", closeHelp);
if (helpBackdrop)
  helpBackdrop.addEventListener("click", () => {
    // clicking dimmed area closes
    closeHelp();
  });

// ESC key & "?" to open
document.addEventListener("keydown", (e) => {
  const open = helpDialog.classList.contains("open");
  if (e.key === "Escape" && open) {
    e.preventDefault();
    closeHelp();
  } else if ((e.key === "?" || (e.shiftKey && e.key === "/")) && !open) {
    e.preventDefault();
    openHelp();
  }
});

// Focus trap inside dialog
helpDialog?.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const focusables = helpDialog.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

// Optional: pulse the help button only once per session
try {
  const k = "hexation_help_seen";
  if (helpBtn && !sessionStorage.getItem(k)) {
    helpBtn.classList.add("attn");
    setTimeout(() => helpBtn.classList.remove("attn"), 6500);
    sessionStorage.setItem(k, "1");
  }
} catch (_) {}
