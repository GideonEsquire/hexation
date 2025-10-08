import { droneFont } from "./main.js";
import {
  HEX_SIZE,
  OUTLINE,
  axialToPixel,
  inBounds,
  triColorIndex,
} from "./geometry.js";
import { getPiece } from "./state.js";
import { legalPlacementHexes } from "./rules.js";
import { Celebration } from "./state.js";

const TRI_COLORS = ["#1b1f27", "#202633", "#242b39"];

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function hexRing(radiusPx) {
  beginShape();
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 180) * (60 * i - 30);
    vertex(radiusPx * Math.cos(ang), radiusPx * Math.sin(ang));
  }
  endShape(CLOSE);
}

export function boardCells(RADIUS, centerX, centerY) {
  const cells = [];
  for (let r = -RADIUS; r <= RADIUS; r++) {
    for (let q = -RADIUS; q <= RADIUS; q++) {
      if (!inBounds(q, r)) continue;
      const { x, y } = axialToPixel(q, r);
      cells.push({ q, r, x: centerX + x, y: centerY + y });
    }
  }
  return cells;
}

export function drawHex(x, y, size, fillCol, strokeCol) {
  push();
  translate(x, y);
  stroke(strokeCol);
  strokeWeight(OUTLINE);
  fill(fillCol);
  beginShape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30); // pointy-top
    vertex(size * Math.cos(angle), size * Math.sin(angle));
  }
  endShape(CLOSE);
  pop();
}

export function polygon(radius) {
  beginShape();
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 180) * (60 * i - 30);
    vertex(radius * Math.cos(ang), radius * Math.sin(ang));
  }
  endShape(CLOSE);
}

export function drawPiece(x, y, p) {
  push();
  translate(x, y);
  noStroke();

  // // --- underglow ---
  // push();
  // const glowColor =
  //   p.side === "W" ? color(255, 255, 255, 30) : color(136, 192, 208, 35); // nord frost blue
  // fill(glowColor);
  // // draw a few increasingly small circles for soft falloff
  // for (let i = 0; i < 4; i++) {
  //   circle(0, 0, HEX_SIZE * (1.3 - i * 0.1));
  // }
  // pop();

  fill(p.side === "W" ? "#eceff4" : "#3b4252");
  circle(0, 0, HEX_SIZE * 1.05);

  noFill();
  stroke(p.side === "W" ? "#2e3440" : "#d8dee9");
  strokeWeight(3);
  circle(0, 0, HEX_SIZE * 0.7);

  if (p.type === "Q") {
    strokeWeight(2.5);
    const r = HEX_SIZE * 0.35;
    beginShape();
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 180) * (60 * i - 30);
      vertex(r * Math.cos(ang), r * Math.sin(ang));
    }
    endShape(CLOSE);
  } else if (p.type === "D") {
    textFont(droneFont || "monospace"); // fallback if not loaded yet
    noStroke();
    fill(p.side === "W" ? "#2e3440" : "#d8dee9");

    const sz = String(p.size || 1);
    textAlign(CENTER, CENTER);
    textSize(HEX_SIZE * 0.45);
    fill(p.side === "W" ? "#2e3440" : "#d8dee9");
    stroke(p.side === "W" ? "#eceff4" : "#3b4252");
    strokeWeight(2);
    text(sz, 0, 2.5);
  }
  pop();
}

export function drawFrame(State, centerX, centerY, RADIUS) {
  const cells = boardCells(RADIUS, centerX, centerY);

  for (const c of cells) {
    let fillCol = TRI_COLORS[triColorIndex(c.q, c.r)];
    const isSel =
      State.selected && State.selected.q === c.q && State.selected.r === c.r;
    if (isSel) fillCol = "#293141";
    drawHex(c.x, c.y, HEX_SIZE, fillCol, "#2d3442");

    const isCenterHex = c.q === 0 && c.r === 0;
    if (isCenterHex) {
      push();
      translate(c.x, c.y);
      noFill();
      stroke("#242b39");
      strokeWeight(3);
      polygon(HEX_SIZE * 0.88);
      pop();
    }
  }

  const targets = legalPlacementHexes();
  for (const t of targets) {
    const { x, y } = axialToPixel(t.q, t.r);
    push();
    translate(centerX + x, centerY + y);
    noFill();
    stroke(
      t.kind === "queen"
        ? "#a3be8c"
        : t.kind === "drone-stack"
          ? "#ebcb8b"
          : "#88c0d0",
    );
    strokeWeight(3);
    polygon(HEX_SIZE * 0.82);
    pop();
  }

  // helper
  function colorForKind(kind) {
    return kind === "queen"
      ? "#a3be8c"
      : kind === "drone-stack"
        ? "#ebcb8b"
        : "#88c0d0";
  }

  for (const mv of State.legalMoves) {
    const { x, y } = axialToPixel(mv.to.q, mv.to.r);
    push();
    translate(centerX + x, centerY + y);
    stroke(colorForKind(mv.kind || "default"));
    strokeWeight(3);
    noFill();
    polygon(HEX_SIZE * 0.82);
    pop();
  }

  for (const c of cells) {
    const p = getPiece(c.q, c.r);
    if (p) drawPiece(c.x, c.y, p);
  }

  // --- Celebration overlay (runs only while active) ---
  if (Celebration.active && State.winner) {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    let t = (now - Celebration.t0) / Celebration.duration; // 0..1
    if (t >= 1) {
      Celebration.active = false; // auto-stop after duration
    } else {
      const eased = easeOutQuad(t);
      const winnerColor =
        State.winner === "W" ? [236, 239, 244] : [136, 192, 208]; // Nord light / frost
      const origin = Celebration.origin || { q: 0, r: 0 };
      const { x, y } = axialToPixel(origin.q, origin.r);

      push();
      translate(centerX + x, centerY + y);
      noFill();

      // 3 expanding hex-rings from center, staggered
      for (let i = 0; i < 3; i++) {
        const delay = i * 0.12;
        const tt = Math.min(Math.max((t - delay) / 0.7, 0), 1); // 0..1 per ring
        if (tt <= 0) continue;
        const alpha = Math.floor(160 * (1 - tt)); // fade out
        const radius = HEX_SIZE * (0.9 + tt * (0.9 + RADIUS * 0.65));
        stroke(winnerColor[0], winnerColor[1], winnerColor[2], alpha);
        strokeWeight(3);
        hexRing(radius);
      }
      pop();

      // subtle vignette flash over whole screen
      push();
      const a = Math.floor(80 * (1 - eased));
      noStroke();
      fill(15, 17, 21, a); // board color w/ low alpha
      rect(0, 0, width, height);
      pop();
    }
  }
}
