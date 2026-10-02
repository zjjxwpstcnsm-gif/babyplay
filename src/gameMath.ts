export function nearPoint(x: number, y: number, cx: number, cy: number, radius: number) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

/** Select the clearest of bounded candidate spawn positions; never spawn under the HUD. */
export function spawnPosition(w: number, h: number, size: number, occupied: { x: number; y: number; size: number }[], initial: boolean, random = Math.random) {
  const left = 18, right = Math.max(left, w - size - 18);
  const top = Math.max(w < 1200 && h > 480 ? 145 : 100, Math.min(132, h * .2));
  const bottom = Math.max(top, h - size * 1.22 - 54);
  let best = { x: left, y: bottom }, bestScore = -Infinity;
  for (let n = 0; n < 14; n++) {
    const candidate = { x: left + random() * (right - left), y: initial ? top + random() * (bottom - top) : bottom };
    const score = occupied.length ? Math.min(...occupied.map(item => Math.hypot(item.x + item.size / 2 - candidate.x - size / 2, item.y + item.size / 2 - candidate.y - size / 2) - (item.size + size) * .55)) : 1;
    if (score > bestScore) { bestScore = score; best = candidate; }
  }
  return best;
}
