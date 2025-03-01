import TokenDocumentArtichron from "../documents/token.mjs";

export { default as sockets } from "./sockets.mjs";

/**
 * Create a unique id for a status condition.
 * @param {string} status     The primary status.
 * @returns {string}          A unique 16-character id.
 */
export function staticId(status) {
  if (status.length >= 16) return status.substring(0, 16);
  return status.padEnd(16, "0");
}

/* -------------------------------------------------- */

/**
 * Convert a bonus value to a number.
 * @param {number|string|null} formula      The string to parse.
 * @param {object} [data]                   The roll data used to replace terms.
 * @returns {number}
 */
export function simplifyBonus(formula, data = {}) {
  if (!formula) return 0;
  if (Number.isNumeric(formula)) return Number(formula);
  try {
    const roll = Roll.create(formula, data);
    return roll.evaluateSync({ strict: false }).total;
  } catch (error) {
    console.error(error);
    return 0;
  }
}

/* -------------------------------------------------- */

export function getActorTargets(tokens) {
  const actors = new Set();
  for (const token of tokens) if (token.actor) actors.add(token.actor);
  return Array.from(actors);
}

/* -------------------------------------------------- */

/**
 * Manipulate an array of token placeables such that a given actor has only
 * only token present in the final array.
 * @param {TokenArtichron[]} tokens         Array of token placeables.
 * @returns {TokenDocumentArtichron[]}      Array of token documents.
 */
export function getTokenTargets(tokens) {
  const map = new Map();
  for (const token of tokens) {
    if (token.actor) map.set(token.actor.uuid, token.document);
  }
  return Array.from(map.values());
}

/* -------------------------------------------------- */
/*   Item and effect macros                           */
/* -------------------------------------------------- */

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
async function toggleEffect(name) {
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
async function useItem(name, event) {
  const actor = _getActor();
  if (!actor) return;
  const item = actor.items.find(item => item._source.name === name);
  if (!item) return;
  item.use({}, { event: event }, {});
}

export const macro = {
  toggleEffect,
  useItem,
};

/* -------------------------------------------------- */
/*   Canvas helpers                                   */
/* -------------------------------------------------- */

/**
 * Find all occupied grid spaces of a token.
 * @param {TokenDocumentArtichron} token      The token on the scene.
 * @returns {import("./types.mjs").Point}
 */
export function getOccupiedGridSpaces(token) {
  if (token.parent.grid.type === CONST.GRID_TYPES.GRIDLESS) {
    const { x, y, elevation, width, height, shape } = token._source;
    return token.getCenterPoint({ x, y, elevation, width, height, shape });
  }
  const offsets = token.getOccupiedGridSpaceOffsets();
  return offsets.map(p => ({ ...token.parent.grid.getCenterPoint(p), elevation: token.elevation }));
}

/* -------------------------------------------------- */

/**
 * Get the minimum distance between two tokens.
 * @param {TokenArtichron} A
 * @param {TokenArtichron} B
 * @returns {number}
 */
export function getMinimumDistanceBetweenTokens(A, B) {
  A = getOccupiedGridSpaces(A.document);
  B = getOccupiedGridSpaces(B.document);
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

/* -------------------------------------------------- */

/**
 * Helper method to prompt for a number of targets, and then returns the targeted tokens.
 * A user can right-click to dismiss, which skips one 'step'.
 * @param {number} count                            The number of targets asked for.
 * @param {object} [options]                        Additional options.
 * @param {TokenArtichron} [options.origin]         The token acting as the origin.
 * @param {number} [options.range]                  Maximum range between origin and target.
 * @param {boolean} [options.allowPreTarget]        Are initial targets allowed to be used?
 * @returns {Promise<TokenDocumentArtichron[]>}     The token documents of those targeted.
 */
export async function awaitTargets(count, { origin, range, allowPreTarget = false } = {}) {
  game.user._targeting = true;
  const useRange = !!origin && Number.isInteger(range) && (range > 0);

  // Pad the range due to the token size.
  if (useRange) range += (canvas.grid.distance * origin.document.width * .5);

  let progressId;
  const bar = (v) => {
    const label = !count ? "" : `Pick ${count} targets (${v}/${count})`;
    const pct = !count ? 1 : (v / count).toNearest(0.1);
    if (progressId) ui.notifications.update(progressId, { pct: pct });
    else progressId = ui.notifications.info(label, { pct, progress: true });
  };

  const isValidTokenTarget = (t) => {
    if (!useRange) return true;
    return getMinimumDistanceBetweenTokens(origin, t) <= range;
  };

  // Set initial targets.
  const tokens = Array.from(game.user.targets).filter(token => {
    return !allowPreTarget || (game.user.targets.size > count) || !isValidTokenTarget(token);
  });
  canvas.tokens.setTargets(tokens, { mode: "release" });

  const { promise, resolve, reject } = Promise.withResolvers();

  let value = game.user.targets.size;
  let id;

  const finish = () => {
    delete game.user._targeting;
    resolve(Array.from(game.user.targets).map(token => token.document));
  };

  if (count === value) {
    finish();
    return;
  }

  let c;
  if (useRange) {
    const points = canvas.grid.getCircle({ x: 0, y: 0 }, range).reduce((acc, p) => acc.concat(Object.values(p)), []);
    c = new PIXI.Graphics();
    c.lineStyle({ width: 4, color: 0x000000, alpha: 1 });
    c.drawShape(new PIXI.Polygon(points));
    c.pivot.set(-(origin.center.x - origin.document.x), -(origin.center.y - origin.document.y));
    origin.addChild(c);
  }

  bar(0);

  canvas.app.view.oncontextmenu = (event) => {
    if (!event.shiftKey) return;
    count--;
    value = game.user.targets.size;
    bar(value);
    if (value === count) {
      Hooks.off("targetToken", id);
      canvas.app.view.oncontextmenu = null;
      c?.destroy();
      finish();
    }
  };

  id = Hooks.on("targetToken", (user, token, bool) => {
    if (game.user !== user) return;
    if (bool && !isValidTokenTarget(token)) {
      canvas.tokens.setTargets([token], { mode: "release" });
      ui.notifications.warn("The targeted token is outside the range!");
      return;
    }
    value = game.user.targets.size;
    bar(value);
    if (value === count) {
      Hooks.off("targetToken", id);
      canvas.app.view.oncontextmenu = null;
      c?.destroy();
      finish();
    }
  });

  return promise;
}

/* -------------------------------------------------- */

/**
 * Handle a delta input for a number value from a form.
 * @param {HTMLInputElement} input  Input that contains the modified value.
 * @param {Document} target         Target document to be updated.
 * @returns {number|void}           The new value, or undefined
 */
export function parseInputDelta(input, target) {
  let value = input.value;
  if (["+", "-"].includes(value[0])) {
    const delta = parseFloat(value);
    value = Number(foundry.utils.getProperty(target, input.dataset.property ?? input.name)) + delta;
  }
  else if (value[0] === "=") value = Number(value.slice(1));
  if (Number.isNaN(value)) return;
  if (input.max) value = Math.min(value, parseInt(input.max));
  input.value = value;
  return value;
}

/* -------------------------------------------------- */

/**
 * Find the 'first' active user who is the owner of a document.
 * @param {Document} document     An actor, combatant, or other document.
 * @returns {User|null}           An owner.
 */
export function firstOwner(document) {
  const [players, gms] = game.users.filter(u => {
    return u.active && document.testUserPermission(u, "OWNER");
  }).sort((a, b) => a.id.localeCompare(b.id)).partition(u => u.isGM);
  if (players.length) return players[0];
  if (gms.length) return gms[0];
  return null;
}

/* -------------------------------------------------- */

/**
 * Convert a number to a roman numeral.
 * @param {number} number     The number to convert.
 * @returns {string}          The roman numeral string.
 */
export function romanize(number) {
  const digits = String(number).split("");
  const key = [
    "", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
    "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
    "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX",
  ];
  let roman = "";
  let i = 3;
  while (i--) roman = (key[+digits.pop() + (i * 10)] || "") + roman;
  return Array(+digits.join("") + 1).join("M") + roman;
}
