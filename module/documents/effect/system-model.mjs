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

  /**
   * Retrieve an object for roll data.
   * @returns {object}
   */
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
      itemData: new JSONField()
    };
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.parent.transfer = false;
  }

  /** @override */
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

  /**
   * Is this a fusion that is currently modifying a target item?
   * @type {boolean}
   */
  get isActiveFusion() {
    return !this.transferrableFusion;
  }

  /**
   * Delete this fusion and restore the original item.
   * @param {object} [options]              Options to modify the splitting process.
   * @param {boolean} [options.keepId]      Restore the item with its original id?
   * @returns {Promise<ItemArtichron|null>}
   */
  async unfuse({keepId = true} = {}) {
    if (!this.isActiveFusion) {
      throw new Error("This is not an active fusion.");
    }

    const item = this.parent.parent;
    if (item instanceof Actor) {
      throw new Error("The fusion effect is living on an actor!");
    }

    const actor = item.isEmbedded ? item.parent : undefined;
    const pack = item.isEmbedded ? undefined : item.compendium?.metadata.id ?? undefined;

    if (actor && actor.items.has(this.itemData._id)) keepId = false;
    else if (item.compendium && item.compendium.index.has(this.itemData._id)) keepId = false;
    else if (game.items.has(this.itemData._id)) keepId = false;

    await this.parent.delete();
    return getDocumentClass("Item").create(this.itemData, {pack, parent: actor, keepId});
  }

  /**
   * Create a prompt to delete this fusion and restore the original item.
   * @param {object} [options]      Options to modify the splitting process.
   * @returns {Promise<ItemArtichron|null>}
   */
  async unfuseDialog(options = {}) {
    if (!this.isActiveFusion) {
      throw new Error("This is not an active fusion.");
    }

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.format("ARTICHRON.ItemFusionDialog.UnfuseTitle", {
          source: this.itemData.name,
          target: this.parent.parent.name
        }),
        icon: "fa-solid fa-volcano"
      },
      yes: {icon: "fa-solid fa-bolt"},
      rejectClose: false,
      modal: true
    });

    if (!confirm) return null;

    return this.unfuse(options);
  }

  /**
   * Utility method for translating a change into a human-readable label.
   * @param {object} change
   * @param {string} change.key
   * @param {number} change.mode
   * @param {string} change.value
   * @returns {string}
   */
  static translateChange({key, mode, value}) {
    if (mode === CONST.ACTIVE_EFFECT_MODES.ADD) mode = "ADD";
    else if (mode === CONST.ACTIVE_EFFECT_MODES.OVERRIDE) mode = "OVERRIDE";
    else if (mode === CONST.ACTIVE_EFFECT_MODES.UPGRADE) mode = "OVERRIDE";

    let locale;
    let options;

    // Special cases: resistances
    if (key.startsWith("system.resistances.")) {
      const [,, type] = key.split(".");
      locale = `ARTICHRON.ItemFusionChanges.Resistance.${mode}`;
      options = {change: value, type: type};
    }

    // Special case: damage
    else if (key.startsWith("system.damage")) {
      value = JSON.parse(`[${value}]`);
      value = Array.isArray(value) ? value : [value];

      const formatter = new Intl.ListFormat("en", {style: "long", type: "conjunction"});
      const list = formatter.format(value.map(({formula, type}) => {
        return `${formula} ${game.i18n.localize(CONFIG.SYSTEM.DAMAGE_TYPES[type].label)}`;
      }));

      locale = `ARTICHRON.ItemFusionChanges.Damage.${mode}`;
      options = {change: list};
    }

    // Special case: wielding
    else if (key.startsWith("system.wield.")) {
      value = parseInt(value);
      locale = `ARTICHRON.ItemFusionChanges.${value === 1 ? "Wield" : "WieldPl"}.${mode}`;
    }

    // Regular cases
    else {
      const map = {
        name: "Name",
        img: "Image",
        "system.price.value": "Price",
        "system.weight.value": "Weight",
        "system.armor.value": "Armor",
        "system.range.value": "Range",
        "system.damage": "Damage"
      }[key];
      locale = `ARTICHRON.ItemFusionChanges.${map}.${mode}`;
      options = {change: value};
    }

    if (game.i18n.has(locale)) return game.i18n.format(locale, options);
    throw new Error(`The attempted key '${key}' is an invalid key to translate!`);
  }

  /**
   * Attempt to translate the changes of this fusion into something human-readable.
   * @returns {string[]}      Readable labels.
   */
  translateChanges() {
    const labels = [];
    for (const change of this.parent.changes) {
      try {
        const label = this.constructor.translateChange(change);
        labels.push(label);
      } catch (err) {
        console.warn(err);
      }
    }
    return labels;
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

  get isGranted() {
    return !!this.source && this.granted;
  }

  /** @override */
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

  /**
   * A store of granted buffs.
   * @type {Map<string, Set<string>>}
   */
  static origins = new Map();

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    if (!this.source || this.parent.uuid.startsWith("Item.") || this.parent.uuid.startsWith("Compendium.")) return;
    if (!EffectBuffData.origins.get(this.source)) EffectBuffData.origins.set(this.source, new Set());
    EffectBuffData.origins.get(this.source).add(this.parent.uuid);
  }
}
