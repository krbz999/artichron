const {BooleanField, DocumentUUIDField, JSONField, StringField, SchemaField} = foundry.data.fields;

/**
 * System data for ActiveEffects.
 * @property {object} duration
 * @property {string} duration.type       When does this effect automatically expire?
 */
export class ActiveEffectSystemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
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

  getRollData(options = {}) {
    throw new Error("The 'getRollData' method of active effects must be subclassed.");
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

/**
 * System data for "Fusions".
 * @property {string} itemData      A block of item data for a source item.
 */
export class EffectFusionData extends ActiveEffectSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      itemData: new JSONField({required: true, initial: ""})
    };
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.parent.transfer = false;
  }

  getRollData() {
    return {
      fusion: {
        ...this.itemData?.system ?? {},
        name: this.itemData?.name ?? ""
      }
    };
  }

  /**
   * The fields this effect may apply to.
   * @type {Set<string>}
   */
  get BONUS_FIELDS() {
    return this.parent.parent.system.BONUS_FIELDS;
  }

  /**
   * Is this a fusion that can be transferred?
   * @type {boolean}
   */
  get transferrableFusion() {
    return foundry.utils.getType(this.itemData) !== "Object";
  }

  async unfuse() {
    if (this.transferrableFusion) {
      throw new Error("The effect is not a granted fusion!");
    }

    const item = this.parent.parent;
    if (item instanceof Actor) {
      throw new Error("The fusion effect is living on an actor!");
    }

    const actor = item.isEmbedded ? item.parent : undefined;
    const pack = item.isEmbedded ? undefined : item.compendium?.metadata.id ?? undefined;

    return Promise.all([
      Item.implementation.create(this.itemData, {pack, parent: actor}),
      this.parent.delete()
    ]);
  }
}

/**
 * System data for "Buffs".
 * @property {string} source        The uuid of a source item this effect was granted by.
 * @property {boolean} granted      Has this been granted?
 */
export class EffectBuffData extends ActiveEffectSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      source: new DocumentUUIDField({type: "Item", embedded: true, label: "ARTICHRON.EffectProperty.Source"}),
      granted: new BooleanField({label: "ARTICHRON.EffectProperty.Granted"})
    };
  }

  getRollData() {
    if (!this.source) return {};

    let source;
    try {
      source = fromUuidSync(this.source);
    } catch (err) {
      console.warn(err);
      return {};
    }
    return source.getRollData?.() ?? {};
  }

  static origins = new Map();

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    if (!this.source || this.parent.uuid.startsWith("Item.") || this.parent.uuid.startsWith("Compendium.")) return;
    if (!EffectBuffData.origins.get(this.source)) EffectBuffData.origins.set(this.source, new Set());
    EffectBuffData.origins.get(this.source).add(this.parent.uuid);
  }
}
