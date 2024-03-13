/**
 * Convert a bonus value to a number.
 * @param {number|string|null} formula      The string to parse.
 * @param {object} [data={}]                The roll data used to replace terms.
 * @returns {number}
 */
function simplifyFormula(formula, data = {}) {
  if (!formula) return 0;
  if (Number.isNumeric(formula)) return Number(formula);
  try {
    const roll = new Roll(formula, data);
    return roll.isDeterministic ? Roll.safeEval(roll.formula) : 0;
  } catch (error) {
    console.error(error);
    return 0;
  }
}

/* ---------------------------------- */
/*                                    */
/*       Item and Effect macros       */
/*                                    */
/* ---------------------------------- */

/**
 * Get actor instance from speaker.
 * @returns {ActorArtichron|null}
 */
function _getActor() {
  let actor;
  const s = ChatMessage.implementation.getSpeaker();
  if (s.token) actor = game.actors.tokens[s.token];
  actor ??= game.actors.get(s.actor);
  return actor ?? null;
}

/**
 * Toggle an effect on an actor by name. It may be on an item.
 * @param {string} name     Name of the effect.
 * @returns {Promise<ActiveEffectArtichron>}
 */
async function toggleEffect(name) {
  const actor = _getActor();
  if (!actor) return null;
  let effect;
  for (const e of actor.allApplicableEffects()) {
    if (e.name === name) {
      effect = e;
      break;
    }
  }
  if (!effect) return null;
  return effect.update({disabled: !effect.disabled});
}

export {
  simplifyFormula,
  toggleEffect
};
