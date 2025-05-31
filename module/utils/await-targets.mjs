/**
 * Helper method to prompt for a number of targets, and then returns the targeted tokens.
 * A user can right-click to dismiss, which skips one 'step'.
 * @param {number} count                              The number of targets asked for.
 * @param {object} [options={}]                       Additional options.
 * @param {TokenArtichron} [options.origin]           The token acting as the origin.
 * @param {number} [options.range]                    Maximum range between origin and target.
 * @param {boolean} [options.allowPreTarget=false]    Are initial targets allowed to be used?
 * @returns {Promise<TokenDocumentArtichron[]>}       The token documents of those targeted.
 */
export default async function awaitTargets(count, { origin, range, allowPreTarget = false } = {}) {
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
    return artichron.utils.getMinimumDistanceBetweenTokens(origin, t) <= range;
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
