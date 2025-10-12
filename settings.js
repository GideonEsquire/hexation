import { setAnimateBackground } from "./background.js";
import { setMuted, isMuted } from "./sounds.js";

// Optional: only if you have multi-player API
let setPlayerCountFn = null;
export function __wireSetPlayerCount(fn) {
  setPlayerCountFn = fn;
}

const KEY = "hexation_settings";
const DEFAULTS = { animateBg: true, players: 2, mute: false };

export function getSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}
export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function applySettings(s) {
  setAnimateBackground(!!s.animateBg);
  setMuted(!!s.mute);
  if (setPlayerCountFn && typeof setPlayerCountFn === "function") {
    const n = Math.max(2, Math.min(6, s.players | 0));
    setPlayerCountFn(n);
  }
}

// Wire the dialog UI and attach events
export function initSettingsUI(applyOnChange) {
  const btn = document.getElementById("settingsBtn");
  const dialog = document.getElementById("settingsDialog");
  const backdrop = document.getElementById("settingsBackdrop");
  const close = document.getElementById("settingsClose");

  const chkAnim = document.getElementById("setAnimateBg");
  const chkMute = document.getElementById("setMute");
  const rngPlayers = document.getElementById("setPlayers");
  const lblPlayers = document.getElementById("setPlayersVal");

  // open/close
  function open() {
    backdrop.classList.add("open");
    dialog.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
    dialog.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
  }
  function closeDlg() {
    backdrop.classList.remove("open");
    dialog.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  btn?.addEventListener("click", open);
  close?.addEventListener("click", closeDlg);
  backdrop?.addEventListener("click", closeDlg);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dialog.classList.contains("open")) {
      e.preventDefault();
      closeDlg();
    }
  });

  // load & reflect settings
  const s = getSettings();
  chkAnim.checked = !!s.animateBg;
  chkMute.checked = !!s.mute;
  rngPlayers.value = String(s.players);
  lblPlayers.textContent = String(s.players);

  function commit() {
    const next = {
      animateBg: !!chkAnim.checked,
      mute: !!chkMute.checked,
      players: Math.max(2, Math.min(6, parseInt(rngPlayers.value || "2", 10))),
    };
    saveSettings(next);
    applySettings(next);
    applyOnChange?.(next); // let main/UI refresh as needed
    lblPlayers.textContent = String(next.players);
  }

  chkAnim.addEventListener("change", commit);
  chkMute.addEventListener("change", commit);
  rngPlayers.addEventListener("input", () => {
    lblPlayers.textContent = String(rngPlayers.value);
  });
  rngPlayers.addEventListener("change", commit);

  // Apply on first load
  applySettings(s);
  applyOnChange?.(s);
}
