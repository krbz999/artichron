/**
 * Find all occupied grid spaces of a token.
 * @param {TokenDocumentArtichron} token    The token on the scene.
 * @returns {import("@common/_types.mjs").ElevatedPoint}
 */
export default function getOccupiedGridSpaces(token) {
  if (token.parent.grid.type === CONST.GRID_TYPES.GRIDLESS) {
    const { x, y, elevation, width, height, shape } = token._source;
    return token.getCenterPoint({ x, y, elevation, width, height, shape });
  }
  const offsets = token.getOccupiedGridSpaceOffsets();
  return offsets.map(p => ({ ...token.parent.grid.getCenterPoint(p), elevation: token.elevation }));
}
