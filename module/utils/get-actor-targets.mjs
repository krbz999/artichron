/**
 * Get a unique array of actors from an iterable of tokens.
 * @param {Iterable<Token>} tokens    The tokens.
 * @returns {ActorArtichron[]}        The actors with no duplicates.
 */
export default function getActorTargets(tokens) {
  const actors = new Set();
  for (const token of tokens) if (token.actor) actors.add(token.actor);
  return Array.from(actors);
}
