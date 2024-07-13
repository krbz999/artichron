import MeasuredTemplateArtichron from "../documents/template/template.mjs";
export {default as simplifyRollFormula} from "./simplify-formula.mjs";
export {default as sockets} from "./sockets.mjs";

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
    return roll.evaluateSync({strict: false}).total;
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
 * @returns {Promise<ActiveEffectArtichron|null>}
 */
export async function toggleEffect(name) {
  const actor = _getActor();
  if (!actor) return null;

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

  if (!effect) return null;
  return effect.update({disabled: !effect.disabled});
}

/* -------------------------------------------------- */
/*   Canvas helpers                                   */
/* -------------------------------------------------- */

/**
 * Find all occupied grid spaces of a token.
 * @param {TokenArtichron} token      The token on the scene.
 * @returns {Point[]}                 An array of x-y coordinates.
 */
export function getOccupiedGridSpaces(token) {
  const points = [];
  const shape = token.shape;
  const [i, j, i1, j1] = canvas.grid.getOffsetRange(token.bounds);
  const delta = (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) ? canvas.dimensions.size : 1;
  const offset = (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) ? canvas.dimensions.size / 2 : 0;
  for (let x = i; x < i1; x += delta) {
    for (let y = j; y < j1; y += delta) {
      const point = canvas.grid.getCenterPoint({i: x + offset, j: y + offset});
      if (shape.contains(point.x - token.document.x, point.y - token.document.y)) points.push(point);
    }
  }
  return points;
}

/* -------------------------------------------------- */

/**
 * Get the minimum distance between two tokens.
 * @param {TokenArtichron} A
 * @param {TokenArtichron} B
 * @returns {number}
 */
export function getMinimumDistanceBetweenTokens(A, B) {
  A = getOccupiedGridSpaces(A);
  B = getOccupiedGridSpaces(B);
  let min = Infinity;
  for (const p of A) {
    for (const q of B) {
      const d = canvas.grid.measurePath([p, q]);
      if (d.distance < min) min = d.distance;
    }
  }
  return min;
}

/* -------------------------------------------------- */

/**
 * @typedef {object} RestrictionOptions
 * @property {boolean} move       Restrict by movement?
 * @property {boolean} sight      Restrict by sight?
 * @property {boolean} light      Restrict by light?
 * @property {boolean} sound      Restrict by sound?
 */

/**
 * Create pixi circle with some size and restrictions, centered on a token.
 * This does take the size of the token into account.
 * @param {TokenArtichron} token                  The center.
 * @param {number} size                           The range in meters.
 * @param {RestrictionOptions} [restrictions]     Wall restrictions.
 * @returns {ClockwiseSweepPolygon}
 */
export function createRestrictedCircle(token, size, restrictions = {}) {
  const hasLimitedRadius = size > 0;
  let radius;
  if (hasLimitedRadius) {
    const cd = canvas.dimensions;
    radius = size * cd.distancePixels + token.document.width * cd.size / 2;
  }

  let sweep = ClockwiseSweepPolygon.create(token.center, {
    radius: radius,
    hasLimitedRadius: hasLimitedRadius
  });

  for (const type of CONST.WALL_RESTRICTION_TYPES) {
    if (!restrictions[type]) continue;
    sweep = sweep.applyConstraint(ClockwiseSweepPolygon.create(token.center, {
      radius: radius,
      type: type,
      hasLimitedRadius: hasLimitedRadius,
      useThreshold: type !== "move"
    }));
  }
  return sweep;
}

/* -------------------------------------------------- */

/**
 * Create pixi rectangle with some size and restrictions, centered on a token.
 * This does take the size of the token into account.
 * @param {TokenArtichron} token                  The center.
 * @param {number} size                           The range in meters.
 * @param {RestrictionOptions} [restrictions]     Wall restrictions.
 * @returns {ClockwiseSweepPolygon}
 */
export function createRestrictedRect(token, size, restrictions = {}) {
  const rectangles = (size > 0) ? [createRect(token, size)] : [];

  let sweep = ClockwiseSweepPolygon.create(token.center, {
    boundaryShapes: rectangles
  });

  for (const type of CONST.WALL_RESTRICTION_TYPES) {
    if (!restrictions[type]) continue;
    sweep = sweep.applyConstraint(ClockwiseSweepPolygon.create(token.center, {
      type: type,
      boundaryShapes: rectangles,
      useThreshold: type !== "move"
    }));
  }
  return sweep;
}

/* -------------------------------------------------- */

/**
 * Find tokens within a given circular distance from another token.
 * This does take the size of the token into account.
 * @param {TokenArtichron} token                  The center.
 * @param {number} size                           The range in meters.
 * @param {RestrictionOptions} [restrictions]     Wall restrictions.
 * @returns {TokenArtichron[]}
 */
export function findTokensCircle(token, size, restrictions = {}) {
  const circular = game.settings.get("artichron", "circularTokens");
  const threshold = game.settings.get("artichron", "templateAreaThreshold");

  const dp = canvas.dimensions.distancePixels;
  const limit = (circular ? Math.PI * (dp ** 2) / 4 : dp ** 2) * threshold;

  const tokenArea = (token) => {
    if (!circular) return token.bounds.toPolygon();
    return ClockwiseSweepPolygon.create(token.center, {
      radius: token.w / 2,
      hasLimitedRadius: true
    });
  };

  const sweep = createRestrictedCircle(token, size, restrictions);
  const tokens = canvas.tokens.quadtree.getObjects(sweep.bounds, {
    collisionTest: ({t}) => {
      const intersection = sweep.intersectPolygon(tokenArea(t));
      return intersection.signedArea() >= limit;
    }
  });
  return Array.from(tokens);
}

/* -------------------------------------------------- */

/**
 * Find tokens within a given rectangle centered on a token.
 * This does take the size of the token into account.
 * @param {TokenArtichron} token                  The center.
 * @param {number} size                           The range in meters.
 * @param {RestrictionOptions} [restrictions]     Wall restrictions.
 * @returns {TokenArtichron[]}
 */
export function findTokensRect(token, size, restrictions = {}) {
  const sweep = createRestrictedRect(token, size, restrictions);
  const rect = createRect(token, size);
  const tokens = canvas.tokens.quadtree.getObjects(rect, {
    collisionTest: ({t}) => {
      if (t.id === token.id) return false;
      const centers = getOccupiedGridSpaces(t.document);
      return centers.some(c => sweep.contains(c.x, c.y));
    }
  });
  return Array.from(tokens);
}

/* -------------------------------------------------- */

/**
 * Create a rectangle of a given size centered on a token.
 * This does take the size of the token into account.
 * @param {TokenArtichron} token      The token that is in the center of the rectangle.
 * @param {number} size               The 'radius' of the rectangle, in meters.
 * @returns {PIXI}
 */
export function createRect(token, size) {
  const spaces = size / canvas.dimensions.distance;
  const {x, y, width} = token.document;
  const x0 = x - spaces * canvas.grid.size;
  const y0 = y - spaces * canvas.grid.size;
  const dist = (width + 2 * spaces) * canvas.grid.size;
  return new PIXI.Rectangle(x0, y0, dist, dist);
}

/* -------------------------------------------------- */

/**
 * Find all token placeables that are at least 50% within a template.
 * @param {MeasuredTemplateArtichron} template
 * @returns {Set<TokenArtichron>}
 */
export function tokensInTemplate(template) {
  const circular = game.settings.get("artichron", "circularTokens");
  const threshold = game.settings.get("artichron", "templateAreaThreshold");

  const shape = template._getGridHighlightShape();
  const dp = canvas.dimensions.distancePixels;
  const limit = (circular ? Math.PI * (dp ** 2) / 4 : dp ** 2) * threshold;

  const tokenArea = (token) => {
    if (!circular) return token.bounds.toPolygon();
    return ClockwiseSweepPolygon.create(token.center, {
      radius: token.w / 2,
      hasLimitedRadius: true
    });
  };

  const tokens = canvas.tokens.quadtree.getObjects(shape.getBounds(), {
    collisionTest: ({t: token}) => {
      const intersection = shape.intersectPolygon(tokenArea(token));
      return intersection.signedArea() >= limit;
    }
  });

  return tokens;
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
export async function awaitTargets(count, {origin, range, allowPreTarget = false} = {}) {
  const useRange = !!origin && Number.isInteger(range) && (range > 0);

  // Pad the range due to the token size.
  if (useRange) range += (canvas.grid.distance * origin.document.width * .5);

  const bar = (v) => {
    const label = !count ? "" : `Pick ${count} targets (${v}/${count})`;
    const pct = !count ? 100 : (v / count * 100).toNearest(0.1);
    SceneNavigation.displayProgressBar({label: label, pct: pct});
  };

  const isValidTokenTarget = (t) => {
    if (!useRange) return true;
    return getMinimumDistanceBetweenTokens(origin, t) <= range;
  };

  // Set initial targets.
  if (!allowPreTarget || (game.user.targets.size > count)) await game.user.updateTokenTargets();
  else for (const t of game.user.targets) if (!isValidTokenTarget(t)) removeTarget(t);

  return new Promise(resolve => {
    let value = game.user.targets.size;
    let id;

    const finish = () => resolve(Array.from(game.user.targets).map(token => token.document));

    if (count === value) {
      finish();
      return;
    }

    ui.notifications.info(`Pick ${count} targets`);

    let c;
    if (useRange) {
      const points = canvas.grid.getCircle({x: 0, y: 0}, range).reduce((acc, p) => acc.concat(Object.values(p)), []);
      // const shape = CONFIG.Canvas.polygonBackends.move.create(center, {
      //   type: "move",
      //   boundaryShapes: [new PIXI.Polygon(points)],
      //   debug: false
      // });

      c = new PIXI.Graphics();
      c.lineStyle({width: 4, color: 0x000000, alpha: 1});
      c.drawShape(new PIXI.Polygon(points));
      c.pivot.set(-origin.w / 2, -origin.h / 2);
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
        removeTarget(token);
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
  });
}

/* -------------------------------------------------- */

/**
 * Properly and visually remove a target from the user.
 * @param {TokenArtichron} token      The token to remove.
 * @returns {void}
 */
export function removeTarget(token) {
  const targets = new Set(game.user.targets);
  targets.delete(token);
  return game.user.updateTokenTargets([...targets.map(token => token.id)]);
}

/* -------------------------------------------------- */

/**
 * Properly and visually add a target to the user.
 * @param {TokenArtichron} token      The token to add.
 * @returns {void}
 */
export function addTarget(token) {
  const targets = new Set(game.user.targets);
  targets.add(token);
  return game.user.updateTokenTargets([...targets.map(token => token.id)]);
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
    "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"
  ];
  let roman = "";
  let i = 3;
  while (i--) roman = (key[+digits.pop() + (i * 10)] || "") + roman;
  return Array(+digits.join("") + 1).join("M") + roman;
}
