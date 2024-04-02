/**
 * Convert a bonus value to a number.
 * @param {number|string|null} formula      The string to parse.
 * @param {object} [data={}]                The roll data used to replace terms.
 * @returns {number}
 */
export function simplifyFormula(formula, data = {}) {
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
export async function toggleEffect(name) {
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

/* ---------------------------------- */
/*                                    */
/*           Canvas helpers           */
/*                                    */
/* ---------------------------------- */

/**
 * Get the centers of all grid spaces that overlap with a token document.
 * @param {TokenDocument5e} tokenDoc      The token document on the scene.
 * @returns {object[]}                    An array of xy coordinates.
 */
export function getOccupiedGridSpaces(tokenDoc) {
  const {width, height, x, y} = tokenDoc;
  const grid = tokenDoc.parent.grid.size;
  const halfGrid = grid / 2;

  if (width <= 1 && height <= 1) return [{x: x + halfGrid, y: y + halfGrid}];

  const centers = [];
  for (let a = 0; a < width; a++) {
    for (let b = 0; b < height; b++) {
      centers.push({x: x + a * grid + halfGrid, y: y + b * grid + halfGrid});
    }
  }
  return centers;
}

/**
 * @typedef {object} RestrictionOptions
 * @property {boolean} move       Restrict by movement?
 * @property {boolean} sight      Restrict by sight?
 * @property {boolean} light      Restrict by light?
 * @property {boolean} sound      Restrict by sound?
 */

/**
 * Create pixi circle with some size and restrictions, centered on a token.
 * @param {Token5e} token                         The center.
 * @param {number} size                           The range in feet.
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

/**
 * Create pixi rectangle with some size and restrictions, centered on a token.
 * @param {Token5e} token                         The center.
 * @param {number} size                           The range in feet.
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

/**
 * Find tokens within a given circular distance from another token.
 * @param {Token5e} token                         The center.
 * @param {number} size                           The range in feet.
 * @param {RestrictionOptions} [restrictions]     Wall restrictions.
 * @returns {Token5e[]}
 */
export function findTokensCircle(token, size, restrictions = {}) {
  const sweep = createRestrictedCircle(token, size, restrictions);
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

/**
 * Find tokens within a given rectangle centered on a token.
 * @param {Token5e} token                         The center.
 * @param {number} size                           The range in feet.
 * @param {RestrictionOptions} [restrictions]     Wall restrictions.
 * @returns {Token5e[]}
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

/**
 * Create a rectangle of a given size centered on a token.
 * @param {Token5e} token     The token that is in the center of the rectangle.
 * @param {number} size       The 'radius' of the rectangle, in feet.
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

/**
 * Find all token placeables that are at least 50% within a template.
 * @param {MeasuredTemplateArtichron} template
 * @returns {Set<TokenArtichron>}
 */
export function tokensInTemplate(template) {
  const circular = game.settings.get("artichron", "circularTokens");
  const threshold = game.settings.get("artichron", "templateAreaThreshold");

  const clone = template.shape.clone();
  Object.assign(clone, template.center);
  const dp = canvas.dimensions.distancePixels;
  const limit = (circular ? Math.PI * (dp ** 2) / 4 : dp ** 2) * threshold;

  const tokenArea = (token) => {
    if (!circular) return token.bounds.toPolygon();
    return ClockwiseSweepPolygon.create(token.center, {
      radius: token.w / 2,
      hasLimitedRadius: true
    });
  };

  const tokens = canvas.tokens.quadtree.getObjects(template.bounds, {
    collisionTest: ({t}) => {
      const intersection = clone.intersectPolygon(tokenArea(t));
      return intersection.signedArea() >= limit;
    }
  });

  return tokens;
}
