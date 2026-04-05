/**
 * Get the minimum distance between two tokens.
 * @param {TokenArtichron} A
 * @param {TokenArtichron} B
 * @returns {number}
 */
export default function getMinimumDistanceBetweenTokens(A, B) {
  A = artichron.utils.getOccupiedGridSpaces(A.document);
  B = artichron.utils.getOccupiedGridSpaces(B.document);
  let min = Infinity;
  for (const p of A) {
    for (const q of B) {
      const d = canvas.grid.measurePath([p, q]);
      if (d.distance < min) min = d.distance;
      if (!min) return 0;
    }
  }
  return min;
}
