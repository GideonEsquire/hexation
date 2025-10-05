export const RADIUS = 5;
export const HEX_SIZE = 36;
export const OUTLINE = 1.5;

export const dirs = [
  { q: +1, r: 0 },
  { q: +1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: +1 },
  { q: 0, r: +1 },
];

export function isCenter(q, r) {
  return q === 0 && r === 0;
}

export function isPerimeter(q, r) {
  return (
    Math.abs(q) === RADIUS ||
    Math.abs(r) === RADIUS ||
    Math.abs(q + r) === RADIUS
  );
}

export function axialToPixel(q, r) {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = HEX_SIZE * ((3 / 2) * r);
  return { x, y };
}

export function pixelToAxial(x, y) {
  const qf = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / HEX_SIZE;
  const rf = ((2 / 3) * y) / HEX_SIZE;
  return cubeRound(axialToCube(qf, rf));
}

export function axialToCube(q, r) {
  return { x: q, y: -q - r, z: r };
}

export function cubeToAxial(x, y, z) {
  return { q: x, r: z };
}

export function cubeRound(c) {
  let rx = Math.round(c.x),
    ry = Math.round(c.y),
    rz = Math.round(c.z);
  const x_diff = Math.abs(rx - c.x);
  const y_diff = Math.abs(ry - c.y);
  const z_diff = Math.abs(rz - c.z);
  if (x_diff > y_diff && x_diff > z_diff) rx = -ry - rz;
  else if (y_diff > z_diff) ry = -rx - rz;
  else rz = -rx - ry;
  return cubeToAxial(rx, ry, rz);
}

export function inBounds(q, r) {
  return (
    Math.abs(q) <= RADIUS && Math.abs(r) <= RADIUS && Math.abs(q + r) <= RADIUS
  );
}

export function triColorIndex(q, r) {
  return (((q - r) % 3) + 3) % 3;
}
