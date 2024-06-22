export default class CombatArtichron extends Combat {
  /** @override */
  setupTurns() {
    const o = this.turn; // store the old turn value since core will bludgeon it.
    const turns = super.setupTurns();
    const result = this._alternateSort(turns);
    this.turns = result;
    if (o !== null) this.turn = Math.clamp(o, 0, result.length);
    return result;
  }

  /**
   * Sort combatants, alternating between negative and non-negative disposition.
   * @param {Combatant[]} turns     The normal initiative-defined turn order.
   */
  _alternateSort(turns) {
    if (!turns.length) return;

    const rule = (combatant) => combatant?.token.disposition >= 0;

    let firstC;
    const [hostile, friendly] = turns.reduce((acc, combatant) => {
      if (!combatant.token) return acc;
      const friendly = rule(combatant);
      if (friendly) acc[1].push(combatant);
      else acc[0].push(combatant);
      firstC ??= combatant;
      return acc;
    }, [[], []]);
    const [first, second] = rule(firstC) ? [friendly, hostile] : [hostile, friendly];

    let newarr = [];
    let i = 0;
    let f = 0;
    let s = 0;

    while (first[i] || second[i]) {
      if (first[i]) {
        newarr.push(first[i]);
      } else if (first.length) {
        newarr.push(first[f]);
        f = (f + 1 === first.length) ? 0 : f + 1;
      }

      if (second[i]) {
        newarr.push(second[i]);
      } else if (second.length) {
        newarr.push(second[s]);
        s = (s + 1 === second.length) ? 0 : s + 1;
      }
      i++;
    }

    return this.turns = newarr;
  }

  /** @override */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if (game.user.id === userId) this.expireCombatEffects();
  }

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

  /** @override */
  async _onStartRound() {
    await super._onStartRound();

    const [defeated, undefeated] = this.combatants.contents.partition(c => !c.isDefeated && !!c.actor);
    await this._promptRoundStartConditions(undefeated);

    if (this.previous.round === 0) return;

    const updates = [];
    for (const [i, c] of undefeated.entries()) {
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
      const health = c.actor.system.pools.health.max;
      const hindered = c.actor.appliedConditionLevel("hindered");
      const value = Math.max(1, c.system.pips + health - hindered);
      updates.push({_id: c.id, initiative: roll.total, "system.pips": value});
    }

    for (const c of defeated) updates.push({_id: c.id, initiative: null});

    await this.updateEmbeddedDocuments("Combatant", updates);
    await this.update({turn: 0});
  }

  /** @override */
  async _onEndTurn(combatant) {
    await super._onEndTurn(combatant);

    // Get the highest of the actor's stamina/mana pool, and keep that many of the combatant's pips.
    const actor = combatant.actor;
    if (!actor) return;
    const pips = combatant.system.pips;
    const {stamina, mana} = actor.system.pools;
    const max = Math.max(stamina.max, mana.max);
    await combatant.update({"system.pips": Math.min(pips, max)});
  }

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

  /** @inheritDoc */
  _onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId) {
    // overriding this option since core will find the first entry of the combatant and use its turn value
    options.combatTurn = this.turn;
    super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);
  }

  /** @inheritDoc */
  _onCreateDescendantDocuments(parent, collection, documents, changes, options, userId) {
    // overriding this option since core will find the first entry of the combatant and use its turn value
    options.combatTurn = this.turn;
    super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);
  }

  /** @inheritDoc */
  _onDeleteDescendantDocuments(parent, collection, documents, changes, options, userId) {
    // overriding this option since core will find the first entry of the combatant and use its turn value
    options.combatTurn = this.turn;
    super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);
  }
}
