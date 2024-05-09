const {DocumentUUIDField, StringField, SchemaField} = foundry.data.fields;

export class ActiveEffectSystemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      source: new DocumentUUIDField({type: "Item", embedded: true, label: "ARTICHRON.EffectProperty.Source"}),
      duration: new SchemaField({
        type: new StringField({
          required: true,
          initial: "none",
          choices: CONFIG.SYSTEM.EFFECT_DURATION_TYPES,
          label: "ARTICHRON.EffectProperty.Duration"
        })
      })
    };
  }

  static origins = new Map();

  /** @override */
  prepareDerivedData() {
    if (!this.source || this.parent.uuid.startsWith("Item.") || this.parent.uuid.startsWith("Compendium.")) return;
    if (!ActiveEffectSystemModel.origins.get(this.source)) ActiveEffectSystemModel.origins.set(this.source, new Set());
    ActiveEffectSystemModel.origins.get(this.source).add(this.parent.uuid);
  }

  getRollData({async = false} = {}) {
    if (!this.source) return {};
    if (async) return this._getRollDataAsync();

    let source;
    try {
      source = fromUuidSync(this.source);
    } catch (err) {
      console.warn(err);
      return {};
    }
    return source.getRollData?.() ?? {};
  }

  async _getRollDataAsync() {
    const source = await fromUuid(this.source);
    return source?.getRollData() ?? {};
  }

  /**
   * Activate socket listeners for deleting buffs when appropriate.
   */
  static activateListeners() {
    Hooks.on("deleteCombat", combat => {
      const actors = new Set(combat.combatants.reduce((acc, c) => {
        const a = c.actor;
        if (a) acc.push(a);
        return acc;
      }, []));

      const loop = doc => {
        const ids = [];
        for (const effect of doc.appliedEffects) {
          if (effect.system.duration.type === "combat") ids.push(effect.id);
        }
        return ids;
      };

      for (const actor of actors) {
        if (game.user !== artichron.utils.firstOwner(actor)) continue;

        const updates = [];

        const ids = loop(actor);
        if (ids.length) updates.push([actor, ids]);

        for (const item of actor.items) {
          const ids = loop(item);
          if (ids.length) updates.push(item, ids);
        }

        Promise.all(updates.map(([doc, ids]) => doc.deleteEmbeddedDocuments("ActiveEffect", ids)));
      }
    });
  }

  /**
   * Describe whether the ActiveEffect has a temporary duration based on when it expires.
   * @type {boolean}
   */
  get isTemporary() {
    return this.duration.type !== "none";
  }
}

export class EffectFusionData extends ActiveEffectSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema()
    };
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.parent.transfer = false;
  }

  /**
   * The fields this effect may apply to.
   * @type {Set<string>}
   */
  get BONUS_FIELDS() {
    return this.parent.parent.system.BONUS_FIELDS;
  }
}

export class EffectBuffData extends ActiveEffectSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema()
    };
  }
}
