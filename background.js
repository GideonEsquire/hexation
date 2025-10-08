// background.js
// Equilateral-triangle background aligned to the hex grid.
// Smoothly tweens between two Nord colors using Perlin noise.

let animPhase = 0;

/**
 * @param {number} hexSize      - same HEX_SIZE as your board
 * @param {function} axialToPixel - function converting (q, r) → {x, y}
 * @param {number} centerX
 * @param {number} centerY
 * @param {string} colorA       - starting Nord color (e.g. "#3b4252")
 * @param {string} colorB       - ending Nord color (e.g. "#434c5e")
 */
export function drawBackgroundTriangles(
  hexSize,
  axialToPixel,
  centerX,
  centerY,
  colorA = "#292e39",
  colorB = "#3B4252",
) {
  noStroke();
  const cols = Math.ceil(width / (Math.sqrt(3) * hexSize)) + 3;
  const rows = Math.ceil(height / (1.5 * hexSize)) + 3;

  for (let r = -rows; r <= rows; r++) {
    for (let q = -cols; q <= cols; q++) {
      const { x, y } = axialToPixel(q, r);
      const cx = centerX + x;
      const cy = centerY + y;
      if (
        cx < -hexSize ||
        cx > width + hexSize ||
        cy < -hexSize ||
        cy > height + hexSize
      )
        continue;
      drawHexAsTriangles(cx, cy, hexSize, animPhase, colorA, colorB);
    }
  }
}

function drawHexAsTriangles(cx, cy, size, phase, colorA, colorB) {
  const baseAngle = Math.PI / 6; // pointy-top orientation
  for (let i = 0; i < 6; i++) {
    const a0 = baseAngle + (i * Math.PI) / 3;
    const a1 = a0 + Math.PI / 3;

    const x0 = cx + Math.cos(a0) * size;
    const y0 = cy + Math.sin(a0) * size;
    const x1 = cx + Math.cos(a1) * size;
    const y1 = cy + Math.sin(a1) * size;

    const n = noise(
      cx * 0.002 + i * 0.1 + phase * 0.5,
      cy * 0.002 - i * 0.07 + phase * 0.5,
    );
    // smoothly blend between colors
    const c = lerpColor(color(colorA), color(colorB), n);
    fill(c);

    beginShape();
    vertex(cx, cy);
    vertex(x0, y0);
    vertex(x1, y1);
    endShape(CLOSE);
  }
}

/** Call once per frame to slowly animate color drift */
export function stepBackgroundAnimation(speed = 0.0005) {
  animPhase += speed;
}
