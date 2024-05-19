export function registerSockets() {
  game.socket.on("artichron.grantBuff", _grantBuffReceive);
}

async function _grantBuffReceive({userId, actorUuid, effectUuid, options = {}}) {
  if (game.user.id !== userId) return null;
  const actor = await fromUuid(actorUuid);
  const effect = await fromUuid(effectUuid);

  if (!(actor instanceof Actor)) return null;
  if (!(effect instanceof ActiveEffect) || (effect.type !== "buff")) return null;

  const effectData = effect.toObject();
  foundry.utils.mergeObject(effectData, {
    "system.source": effect.parent.uuid,
    "system.granted": true
  });
  return ActiveEffect.implementation.create(effectData, {...options, parent: actor});
}

/**
 * Grant a buff to an actor, either directly if possible, or via socket.
 * @param {ActiveEffectArtichron} effect              The buff to grant a copy of.
 * @param {ActorArtichron} actor                      The actor to receive the buff.
 * @param {object} [options]                          Options passed to the creation event.
 * @returns {Promise<ActiveEffectArtichron|void>}     The created effect, if able to create it yourself.
 */
async function createBuffEmit(effect, actor, options = {}) {
  let userId;
  if (actor.isOwner) userId = game.user.id;
  else {
    const gm = game.users.find(u => u.active && u.isGM);
    if (gm) userId = gm.id;
    else {
      const pl = game.users.find(u => {
        return u.active && !u.isGM && actor.testUserPermission(u, "OWNER");
      });
      if (pl) userId = pl.id;
    }
  }

  if (!userId) {
    ui.notifications.warn("ARTICHRON.Warning.CannotEmitRequest", {localize: true});
    return;
  }

  const data = {
    userId: userId,
    actorUuid: actor.uuid,
    effectUuid: effect.uuid,
    options: options
  };

  if (userId === game.user.id) return _grantBuffReceive(data);
  game.socket.emit("artichron.grantBuff", data, true);
}

export default {
  grantBuff: createBuffEmit
};
