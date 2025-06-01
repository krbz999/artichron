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

/* -------------------------------------------------- */

/**
 * Toggle an effect on an actor by name. It may be on an item.
 * @param {string} name     Name of the effect.
 */
export async function toggleEffect(name) {
  const actor = _getActor();
  if (!actor) return;

  const loop = parent => {
    for (const e of parent.allApplicableEffects()) {
      if (e.name === name) return e;
    }
  };

  let effect = loop(actor);
  if (!effect) for (const item of actor.items) {
    effect = loop(item);
    if (effect) break;
  }

  if (!effect) return;
  effect.update({ disabled: !effect.disabled });
}

/* -------------------------------------------------- */

/**
 * Use an item on an actor.
 * @param {string} name               Name of the effect.
 * @param {PointerEvent} [event]      A click event when executed from a macro.
 */
export async function useItem(name, event) {
  const actor = _getActor();
  if (!actor) return;
  const item = actor.items.find(item => item._source.name === name);
  if (!item) return;
  item.use({}, { event: event }, {});
}
