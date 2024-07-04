export default class CombatArtichron extends Combat {
  /** @override */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if (game.user.id === userId) this.expireCombatEffects();
  }

  /* -------------------------------------------------- */

  /**
   * Delete any effects that expire when combat ends.
   * @returns {Promise<ActiveEffectArtichron[]>}      All the deleted effects.
   */
  async expireCombatEffects() {
    const actors = new Set(this.combatants.map(c => c.actor));
    const deleted = [];

    const loop = doc => {
      const ids = [];
      for (const effect of doc.appliedEffects) {
        if (effect.system.expiration.type === "combat") ids.push(effect.id);
      }
      return ids;
    };

    const deleteEffects = async (doc, ids) => {
      const del = await doc.deleteEmbeddedDocuments("ActiveEffect", ids);
      deleted.push(...del);
      return true;
    };

    for (const actor of actors) {
      if (!actor) continue;

      const ids = loop(actor);
      if (ids.length) await deleteEffects(actor, ids);

      for (const item of actor.items) {
        const ids = loop(item);
        if (ids.length) deleteEffects(item, ids);
      }
    }

    return deleted;
  }

  /* -------------------------------------------------- */

  /** @override */
  async _onStartRound() {
    await super._onStartRound();

    const {originals, duplicates, defeated} = this.combatants.reduce((acc, c) => {
      if (c.isDefeated || !c.actor) acc.defeated.push(c);
      else if (c.flags.artichron?.duplicate) acc.duplicates.push(c);
      else acc.originals.push(c);
      return acc;
    }, {originals: [], duplicates: [], defeated: []});

    await this._promptRoundStartConditions(originals);

    const reroll = this.round > 1;
    const combatantUpdates = []; // array of objects
    const combatantCreations = []; // array of objects

    // If needed, reroll initiative internally first.
    const combatants = [];
    if (reroll) {
      for (const [i, c] of originals.entries()) {
        const roll = c.getInitiativeRoll();
        await roll.toMessage({
          sound: i ? null : CONFIG.sounds.dice,
          flavor: game.i18n.format("COMBAT.RollsInitiative", {name: c.name}),
          speaker: ChatMessage.implementation.getSpeaker({
            actor: c.actor,
            token: c.token,
            alias: c.name
          }),
          flags: {"core.initiativeRoll": true}
        });
        const clone = c.clone({initiative: roll.total}, {keepId: true});
        combatants.push(clone);
      }
    }

    // Make the ordering of combatants using actors.
    const order = this._createActorOrder(reroll ? combatants : originals);
    const actors = new Set(); // original actors, for reference later since 'originals' gets emptied.
    for (const {actor} of originals) if (actor) actors.add(actor);

    // Replace each actor in `order` with a combatant. If none exists, make sure to create one.
    for (const [i, actor] of order.entries()) {
      const o = originals.findSplice(c => c.actor === actor);
      if (o) {
        combatantUpdates.push({_id: o.id, initiative: 100 - i});
        continue;
      }

      const d = duplicates.findSplice(c => c.actor === actor);
      if (d) {
        combatantUpdates.push({_id: d.id, initiative: 100 - i});
        continue;
      }

      combatantCreations.push(foundry.utils.mergeObject(actor.combatant.toObject(), {
        "flags.artichron.duplicate": true,
        initiative: 100 - i
      }));
    }

    const deleteIds = duplicates.map(c => c.id);
    for (const d of defeated) deleteIds.push(d.id);

    // Delete, create, and update combatants before updating actors with action points.
    await Promise.all([
      this.deleteEmbeddedDocuments("Combatant", deleteIds),
      this.createEmbeddedDocuments("Combatant", combatantCreations),
      this.updateEmbeddedDocuments("Combatant", combatantUpdates)
    ]);

    // Create and perform actor updates.
    const actorUpdates = [];
    for (const actor of actors) {
      const health = actor.system.pools?.health.max ?? 6;
      const hindered = actor.appliedConditionLevel("hindered");
      const bonus = actor.system.pips.turn * this.getCombatantsByActor(actor).length;
      const value = Math.max(1, health + bonus - hindered);
      actorUpdates.push([actor, {"system.pips.value": value + bonus}]);
    }

    await Promise.all(actorUpdates.map(([actor, update]) => actor.update(update)));

    await this.update({turn: 0});
  }

  /* -------------------------------------------------- */

  /**
   * Prompt the GM to apply any effects from conditions that apply at the start of the round.
   * @param {Combatant[]} combatants      An array of undefeated combatants whose conditions to apply.
   * @returns {Promise}
   */
  async _promptRoundStartConditions(combatants) {
    const actors = new Set(combatants.map(c => c.actor));

    const fieldsets = [];

    for (const actor of actors) {
      const effects = [];
      for (const effect of actor.appliedEffects) {
        if (effect.type !== "condition") continue;
        const primary = effect.system.primary;
        if (!effect.system.constructor.ROUND_START.has(primary)) continue;
        effects.push(effect);
      }

      if (effects.length) {
        fieldsets.push({
          actor: actor,
          effects: effects.map(e => e.system.toFormGroup())
        });
      }
    }

    if (!fieldsets.length) return;

    const content = fieldsets.map(({actor, effects}) => {
      const fieldset = document.createElement("FIELDSET");
      fieldset.dataset.actorUuid = actor.uuid;

      const legend = document.createElement("LEGEND");
      legend.textContent = actor.name;

      fieldset.appendChild(legend);
      for (const e of effects) fieldset.appendChild(e);

      return fieldset.outerHTML;
    }).join("");

    const uuids = await foundry.applications.api.DialogV2.prompt({
      rejectClose: false,
      modal: true,
      content: content,
      window: {
        icon: "fa-solid fa-bolt",
        title: "ARTICHRON.Combat.StartRoundTitle"
      },
      position: {
        width: 400,
        height: "auto"
      },
      ok: {
        label: "ARTICHRON.Combat.StartRoundConfirm",
        icon: "fa-solid fa-bolt",
        callback: (event, button, html) => new FormDataExtended(button.form).object
      }
    });

    for (const [uuid, active] of Object.entries(uuids)) {
      if (!active) continue;
      const effect = await fromUuid(uuid);
      await effect.system.execute();
    }
  }

  /* -------------------------------------------------- */

  /**
   * Create the initiative order using just actors. This array will contain repeats.
   * @param {Combatant[]} combatants      Array of undefeated, unique combatants.
   * @returns {ActorArtichron[]}          Array of actors, with repeats, in initiative order.
   */
  _createActorOrder(combatants) {
    const [hostile, friendly] = combatants.partition(c => c.token.disposition >= 0);
    hostile.sort(this._sortCombatants);
    friendly.sort(this._sortCombatants);

    const equalize = (a, b) => {
      let i = 0;
      const d = [...a];
      while (a.length < b.length) {
        let e = d[i];
        if (!e) i = 0;
        e = d[i];
        a.push(e);
        i++;
      }
    };

    // Make the arrays equal length.
    equalize(hostile, friendly);
    equalize(friendly, hostile);

    const zip = (a, b) => {
      const z = [];
      for (const [i, {actor}] of a.entries()) {
        const e = b[i]?.actor;
        if (actor) z.push(actor);
        if (e) z.push(e);
      }
      return z;
    };

    let order;
    if (hostile[0]?.initiative >= friendly[0]?.initiative) order = zip(hostile, friendly);
    else order = zip(friendly, hostile);

    return order;
  }
}
