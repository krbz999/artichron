/**
 * Register sockets.
 */
export function registerSockets() {
  game.socket.on("system.artichron", handleSocket);

  CONFIG.queries.chatDamage = artichron.data.chatMessages.DamageData._query;
  CONFIG.queries.chatEffects = artichron.data.chatMessages.EffectData._query;
  CONFIG.queries.chatHealing = artichron.data.chatMessages.HealingData._query;
  CONFIG.queries.merchant = artichron.data.actors.MerchantData._query;
  CONFIG.queries.recovery = artichron.data.actors.PartyData._query;
  CONFIG.queries.hero = artichron.data.actors.HeroData._query;
}

/* -------------------------------------------------- */

/**
 * Utility method to direct the socket event.
 * @param {object} eventData
 */
function handleSocket({ action, ...data }) {
  switch (action) {
    case "grantBuff": return _grantBuff(data);
    case "acceptTrade": return _acceptTrade(data);
    default: return null;
  }
}

/* -------------------------------------------------- */

export default {
  grantBuff: createBuffEmit,
  acceptTrade: acceptTradeEmit,
};

/* -------------------------------------------------- */
/*   Trading items                                    */
/* -------------------------------------------------- */

/**
 * Update a chat message to display that a trade has been accepted.
 */
async function _acceptTrade({ userId, messageId }) {
  if (game.user.id === userId) game.messages.get(messageId).update({ "system.traded": true });
}

/* -------------------------------------------------- */

/**
 * Request to update a chat message to note that the trade has been completed.
 * @returns {Promise<void|false>}     Returns false if the request could not be completed.
 */
async function acceptTradeEmit(message) {
  const userId = message.canUserModify(game.user, "update") ? game.user.id : game.users.find(u => {
    return u.active && message.canUserModify(u, "update");
  })?.id;

  if (!userId) {
    ui.notifications.warn("ARTICHRON.Warning.CannotEmitRequest", { localize: true });
    return false;
  }

  const data = {
    action: "acceptTrade",
    userId: userId,
    messageId: message.id,
  };

  if (userId === game.user.id) return _acceptTrade(data);
  game.socket.emit("system.artichron", data);
}

/* -------------------------------------------------- */
/*   Granting buffs                                   */
/* -------------------------------------------------- */

/**
 * Handle the creation of the buff.
 * @param {object} data               Emitted data.
 * @param {string} data.userId        The id of the user to handle the event.
 * @param {string} data.actorUuid     Uuid of the targeted actor.
 * @param {string} data.effectUuid    Uuid of the effect to create a copy of.
 * @param {object} [data.options]     Effect creation options.
 */
async function _grantBuff({ userId, actorUuid, effectUuid, options = {} }) {
  if (game.user.id !== userId) return null;
  const actor = await fromUuid(actorUuid);
  const effect = await fromUuid(effectUuid);

  if (!(actor instanceof Actor)) return null;
  if (!(effect instanceof ActiveEffect) || (effect.type !== "buff")) return null;

  const effectData = effect.toObject();
  foundry.utils.mergeObject(effectData, {
    "system.source": effect.parent.uuid,
    "system.granted": true,
  });
  ActiveEffect.implementation.create(effectData, { ...options, parent: actor });
}

/* -------------------------------------------------- */

/**
 * Grant a buff to an actor, either directly if possible, or via socket.
 * @param {ActiveEffectArtichron} effect      The buff to grant a copy of.
 * @param {ActorArtichron} actor              The actor to receive the buff.
 * @param {object} [options]                  Options passed to the creation event.
 * @returns {Promise}                         The created effect, if able to create it yourself.
 */
async function createBuffEmit(effect, actor, options = {}) {
  const userId = actor.isOwner ? game.user.id : game.users.find(u => {
    return u.active && actor.testUserPermission(u, "OWNER");
  })?.id;

  if (!userId) {
    ui.notifications.warn("ARTICHRON.Warning.CannotEmitRequest", { localize: true });
    return;
  }

  const data = {
    action: "grantBuff",
    userId: userId,
    actorUuid: actor.uuid,
    effectUuid: effect.uuid,
    options: options,
  };

  if (userId === game.user.id) return _grantBuff(data);
  game.socket.emit("system.artichron", data);
}
