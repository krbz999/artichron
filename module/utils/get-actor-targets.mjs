/**
 * Get a unique array of actors from an iterable of tokens.
 * @param {Iterable<Token>} tokens        The tokens.
 * @param {object} [options={}]           Options to configure the filtering.
 * @param {string[]} [options.types=[]]   Specific array of actor types. If empty, no filtering.
 * @returns {ActorArtichron[]}            The actors with no duplicates.
 */
export default function getActorTargets(tokens, { types = [] } = {}) {
  tokens = [...tokens];
  const actors = tokens.reduce((acc, token) => {
    const actor = token.actor;
    if (!actor) return acc;
    if (types.length && !types.includes(actor.type)) return acc;
    return acc.add(actor);
  }, new Set());
  return Array.from(actors);
}
