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
    master.gain.value = 0.6; // 🔊 make it audible across devices

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
