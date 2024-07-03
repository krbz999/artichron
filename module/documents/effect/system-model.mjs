const {NumberField, BooleanField, DocumentUUIDField, JSONField, StringField, SchemaField} = foundry.data.fields;

/**
 * System data for ActiveEffects.
 * @property {object} expiration
 * @property {string} expiration.type     When does this effect automatically expire?
 */
export class ActiveEffectSystemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      expiration: new SchemaField({
        type: new StringField({
          required: true,
          initial: "none",
          choices: CONFIG.SYSTEM.EFFECT_EXPIRATION_TYPES,
          label: "ARTICHRON.EffectProperty.Expiration",
          hint: "ARTICHRON.EffectProperty.ExpirationHint"
        })
      })
    };
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve an object for roll data.
   * @returns {object}
   */
  getRollData(options = {}) {
    throw new Error("The 'getRollData' method of active effects must be subclassed.");
  }

  /* -------------------------------------------------- */

  /**
   * Describe whether the ActiveEffect has a temporary duration based on when it expires.
   * @type {boolean}
   */
  get isTemporary() {
    return this.expiration.type !== "none";
  }
}

/* -------------------------------------------------- */

/**
 * System data for "Fusions".
 * Fusions are effects that hold data for an item which has been destroyed and fused onto another item.
 * @property {string} itemData      A block of item data for a source item.
 * @property {string} subtype       An item subtype this fusion can apply to.
 */
export class EffectFusionData extends ActiveEffectSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      itemData: new JSONField(),
      subtype: new StringField({
        required: true,
        blank: false,
        initial: "weapon",
        label: "ARTICHRON.EffectProperty.SubtypeFusion",
        hint: "ARTICHRON.EffectProperty.SubtypeFusionHint",
        choices: () => {
          const choices = foundry.utils.deepClone(CONFIG.Item.typeLabels);
          delete choices.base;
          return choices;
        }
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  async _preCreate(...T) {
    const allowed = await super._preCreate(...T);
    if (allowed === false) return false;

    const isActor = this.parent.parent.documentName === "Actor";
    const invalidItem = (this.parent.parent.documentName === "Item") && !this.parent.parent.canFuse;
    if (isActor || invalidItem) {
      ui.notifications.warn("ARTICHRON.Warning.InvalidActiveEffectType", {localize: true});
      return false;
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Fusions never apply to their actor.
    this.parent.transfer = false;
  }

  /* -------------------------------------------------- */

  /** @override */
  getRollData() {
    const data = {
      fusion: {...this.itemData?.system ?? {}}
    };
    data.fusion.name = this.itemData?.name ?? "";
    return data;
  }

  /* -------------------------------------------------- */

  /**
   * The fields this effect may apply to.
   * @type {Set<string>}
   */
  static get BONUS_FIELDS() {
    return this.parent.parent.system.constructor.BONUS_FIELDS;
  }

  /* -------------------------------------------------- */

  /**
   * Is this a fusion that can be transferred?
   * @type {boolean}
   */
  get isTransferrableFusion() {
    return foundry.utils.getType(this.itemData) !== "Object";
  }

  /* -------------------------------------------------- */

  /**
   * Is this a fusion that is currently modifying a target item?
   * @type {boolean}
   */
  get isActiveFusion() {
    return !this.isTransferrableFusion;
  }

  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */

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
    else if (key === "system.damage.parts") {
      value = JSON.parse(`[${value}]`);
      value = Array.isArray(value) ? value : [value];

      const formatter = new Intl.ListFormat("en", {style: "long", type: "conjunction"});
      const list = formatter.format(value.map(({formula, type}) => {
        return `${formula} ${CONFIG.SYSTEM.DAMAGE_TYPES[type].label}`;
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
        "system.damage.parts": "Damage"
      }[key];
      locale = `ARTICHRON.ItemFusionChanges.${map}.${mode}`;
      options = {change: value};
    }

    if (game.i18n.has(locale)) return game.i18n.format(locale, options);
    throw new Error(`The attempted key '${key}' is an invalid key to translate!`);
  }

  /* -------------------------------------------------- */

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

/* -------------------------------------------------- */

/**
 * System data for "Buffs".
 * Buffs are effects that apply to an actor. They can live on an item or actor and are granted from a source.
 * @property {string} source        The uuid of a source item this effect was granted by.
 * @property {boolean} granted      Has this been granted?
 */
export class EffectBuffData extends ActiveEffectSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      source: new DocumentUUIDField({type: "Item", embedded: true, label: "ARTICHRON.EffectProperty.Source"}),
      granted: new BooleanField({label: "ARTICHRON.EffectProperty.Granted"}),
      subtype: new StringField({
        label: "ARTICHRON.EffectProperty.SubtypeBuff",
        hint: "ARTICHRON.EffectProperty.SubtypeBuffHint",
        choices: () => {
          const choices = foundry.utils.deepClone(CONFIG.Actor.typeLabels);
          delete choices.base;
          return choices;
        }
      })
    };
  }

  /* -------------------------------------------------- */

  get isGranted() {
    return !!this.source && this.granted;
  }

  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */

  /**
   * A store of granted buffs.
   * @type {Map<string, Set<string>>}
   */
  static origins = new Map();

  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Buffs do not apply to the actor while on an elixir.
    if ((this.parent.parent.documentName === "Item") && (this.parent.parent.type === "elixir")) {
      this.parent.transfer = false;
    }

    if (!this.source || this.parent.uuid.startsWith("Item.") || this.parent.uuid.startsWith("Compendium.")) return;
    if (!EffectBuffData.origins.get(this.source)) EffectBuffData.origins.set(this.source, new Set());
    EffectBuffData.origins.get(this.source).add(this.parent.uuid);
  }
}

/* -------------------------------------------------- */

/**
 * System data for 'Enhancements'.
 * Enhancements are effects that apply to an item. They can live only on an item.
 */
export class EffectEnhancementData extends ActiveEffectSystemModel {
  /** @override */
  async _preCreate(...T) {
    const allowed = await super._preCreate(...T);
    if (allowed === false) return false;

    if (this.parent.parent.documentName === "Actor") {
      ui.notifications.warn("Enhancements can only live on an item.");
      return false;
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.parent.transfer = false;
  }

  /* -------------------------------------------------- */

  /** @override */
  getRollData() {
    return {};
  }
}

/* -------------------------------------------------- */

/**
 * System data for 'Conditions'.
 * These are ailments or other effects with optional support for levels of severity. Can apply to an actor or item.
 * @property {string} primary     The primary status of this condition.
 * @property {number} level       The level of this condition.
 */
export class EffectConditionData extends ActiveEffectSystemModel {
  /**
   * The status ids that have a 'start of round' event.
   * @type {Set<string>}
   */
  static ROUND_START = new Set([
    "bleeding",
    "burning"
  ]);

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      primary: new StringField({required: true, blank: false}),
      level: new NumberField({nullable: true, initial: null, integer: true})
    };
  }

  /* -------------------------------------------------- */
  /*   Data preparation                                 */
  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.parent.transfer = false;
    this.parent.statuses.add(this.primary);
    this.maxLevel = CONFIG.SYSTEM.STATUS_CONDITIONS[this.primary].levels || null;
    if (!this.maxLevel || (this.level > this.maxLevel)) this.level = this.maxLevel;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @override */
  getRollData() {
    const rollData = {};
    for (const status of this.parent.statuses) rollData[status] = 1;
    return rollData;
  }

  /* -------------------------------------------------- */

  /**
   * Transform this condition into a formgroup for the start-of-round prompt.
   * @returns {HTMLElement}
   */
  toFormGroup() {
    const fg = document.createElement("DIV");
    fg.classList.add("form-group");

    const label = document.createElement("LABEL");
    label.textContent = this.parent.name;
    fg.appendChild(label);

    const ff = document.createElement("DIV");
    ff.classList.add("form-fields");
    fg.appendChild(ff);

    const input = document.createElement("INPUT");
    input.type = "checkbox";
    input.name = this.parent.uuid;
    input.setAttribute("checked", "");
    ff.appendChild(input);

    const hint = document.createElement("P");
    hint.classList.add("hint");
    hint.textContent = game.i18n.format(`ARTICHRON.StatusConditions.${this.primary.capitalize()}Hint`, {
      actor: this.parent.parent.name,
      level: this.level
    });
    fg.appendChild(hint);

    return fg;
  }

  /* -------------------------------------------------- */

  /**
   * Increase the level of a condition that has multiple stages.
   * @returns {Promise}
   */
  async increase() {
    const max = CONFIG.SYSTEM.STATUS_CONDITIONS[this.primary].levels;
    if (!max || !(max > 1) || (this.level === max)) return;
    const disabled = this.parent.disabled;
    const diff = Math.min(max, this.level + 1) - this.level;
    await this.parent.update({
      "system.level": Math.min(max, this.level + 1),
      disabled: false
    }, {statusLevelDifference: disabled ? undefined : diff});
  }

  /* -------------------------------------------------- */

  /**
   * Decrease the level of a condition that has multiple stages.
   * It is the responsibility of the caller to delete the condition if it would go below level 1.
   * @returns {Promise}
   */
  async decrease() {
    const disabled = this.parent.disabled;
    const diff = (this.level - 1) - this.level;
    await this.parent.update({
      "system.level": this.level - 1,
      disabled: false
    }, {statusLevelDifference: disabled ? undefined : diff});
  }

  /* -------------------------------------------------- */

  /**
   * Do whatever it may be that this condition might do to its owner.
   * @returns {Promise}
   */
  async execute() {
    switch (this.primary) {
      case "burning": return this.#executeBurning();
      case "bleeding": return this.#executeBleeding();
    }
  }

  /* -------------------------------------------------- */

  /**
   * Execute the effects of the 'burning' condition.
   * @returns {Promise}
   */
  async #executeBurning() {
    const actor = this.parent.parent;
    const formula = "(@level)d12";
    const type = "fire";
    const roll = new CONFIG.Dice.DamageRoll(formula, {level: this.level}, {type: type});
    await roll.toMessage({
      flavor: game.i18n.format("ARTICHRON.StatusConditions.BurningFlavor", {actor: actor.name}),
      sound: null
    });
    return actor.applyDamage({[type]: roll.total}, {defendable: false});
  }

  /* -------------------------------------------------- */

  /**
   * Execute the effects of the 'burning' condition.
   * @returns {Promise}
   */
  async #executeBleeding() {
    const actor = this.parent.parent;
    const formula = "(@level)d6";
    const type = "physical";
    const roll = new CONFIG.Dice.DamageRoll(formula, {level: this.level}, {type: type});
    await roll.toMessage({
      flavor: game.i18n.format("ARTICHRON.StatusConditions.BleedingFlavor", {actor: actor.name}),
      sound: null
    });
    return actor.applyDamage({[type]: roll.total}, {defendable: false, resisted: false});
  }
}
