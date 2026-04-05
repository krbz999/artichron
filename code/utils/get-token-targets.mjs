/**
 * Manipulate an array of token placeables such that a given actor has only
 * only token present in the final array.
 * @param {TokenArtichron[]} tokens         Array of token placeables.
 * @returns {TokenDocumentArtichron[]}      Array of token documents.
 */
export default function getTokenTargets(tokens) {
  const map = new Map();
  for (const token of tokens) {
    if (token.actor) map.set(token.actor.uuid, token.document);
  }
  return Array.from(map.values());
}
