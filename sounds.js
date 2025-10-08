// sounds.js
let ctx = null;
let master = null;
let comp = null;

function ensureGraph() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();

  // Build output chain once: [voice] -> master -> compressor -> destination
  if (!master) {
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 4; // gentle glue, not brickwall
    comp.attack.value = 0.002;
    comp.release.value = 0.25;

    master = ctx.createGain();
    master.gain.value = 1.0; // 🔊 make it audible across devices

    master.connect(comp).connect(ctx.destination);
  }
  return ctx;
}

export async function resumeAudio() {
  const c = ensureGraph();
  if (c.state !== "running") {
    try {
      await c.resume();
    } catch {}
  }
}

export function setVolume(v) {
  ensureGraph();
  master.gain.value = Math.max(0, Math.min(1, v));
}

// Quick diagnostic: run window.__soundTest() in console
export function testBeep() {
  const c = ensureGraph();
  const now = c.currentTime + 0.01;

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(440, now);

  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.5, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

  osc.connect(g).connect(master);
  osc.start(now);
  osc.stop(now + 0.6);
}

// === Lichess-like move "thock" ===
// Short filtered noise + 2 sine partials. Louder & longer than before.
function moveThock() {
  const c = ensureGraph();
  const now = c.currentTime + 0.004;

  // 1) Noise burst through bandpass (the "knock")
  const durN = 0.06;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * durN), c.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * 0.8;

  const noise = c.createBufferSource();
  noise.buffer = buf;

  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1150, now);
  bp.Q.setValueAtTime(0.9, now);

  const nGain = c.createGain();
  nGain.gain.setValueAtTime(0, now);
  nGain.gain.linearRampToValueAtTime(0.25, now + 0.004); // ↑ louder
  nGain.gain.exponentialRampToValueAtTime(0.0008, now + durN);

  noise.connect(bp).connect(nGain).connect(master);
  noise.start(now);
  noise.stop(now + durN + 0.02);

  // 2) Body partials
  function partial(freq, det = 0, peak = 0.18, end = 0.09) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    if (det) osc.detune.setValueAtTime(det, now);

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, now + end);

    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + Math.max(end + 0.02, 0.12));
  }

  partial(220, -6, 0.2, 0.12); // A3-ish
  partial(440, +4, 0.14, 0.1); // A4-ish
}

export const SFX = {
  move: moveThock,
};

// Expose tester globally for convenience
if (typeof window !== "undefined") {
  window.__soundTest = testBeep;
}

// === Celebration Jingle ===
// Two quick arpeggio notes followed by a soft chord.
// Distinct patterns for each side for subtle variety.
function playNote(freq, start, len, type = "sine", gainAmt = 0.15) {
  const c = ensureGraph();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(gainAmt, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + len);
  osc.connect(g).connect(master);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + len + 0.02);
}

function winJingle(side = "W") {
  const c = ensureGraph();
  const base = side === "W" ? 440 : 392; // A4 vs G4
  const scale = [1, 1.25, 1.5, 2]; // small major chord intervals
  const seq =
    side === "W"
      ? [base, base * 1.25, base * 1.5, base * 2] // rising
      : [base * 2, base * 1.5, base * 1.25, base]; // falling

  // quick arpeggio
  seq.forEach((f, i) => playNote(f, i * 0.08, 0.25, "triangle", 0.18));

  // soft chord sustain
  setTimeout(() => {
    scale.forEach((s) => playNote(base * s, 0, 0.6, "sine", 0.1));
  }, 400);
}

SFX.win = winJingle;
