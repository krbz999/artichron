import ActorSystemModel from "./system-model.mjs";

/**
 * @typedef {object} DamageDescription
 * @property {string} type                    The damage type.
 * @property {number} value                   The damage total.
 * @property {DamageOptions} [options]        Damage part options.
 * @property {DamageStatuses} [statuses]      Statuses and the levels that will be applied.
 */

/**
 * @typedef {object} DamageOptions        Options that configure how the damage is applied.
 * @property {boolean} [undefendable]     If `true`, this cannot be reduced by defending.
 * @property {boolean} [irreducible]      If `true`, this cannot be modified by defense values.
 */

/**
 * @typedef {object} DamageStatuses   Record of the statuses that will be applied.
 * @property {number} [bleeding]      How many levels of the 'Bleeding' status will be applied.
 * @property {number} [hindered]      How many levels of the 'Hindered' status will be applied.
 */

const {
  HTMLField, NumberField, SchemaField, SetField, StringField,
} = foundry.data.fields;

/**
 * Extended data model for actor types that participate in combat.
 * These actor types also have health and can make use of equipment.
 */
export default class CreatureData extends ActorSystemModel {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      embedded: {
        Damage: "system.damage.parts",
      },
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      biography: new SchemaField({
        value: new HTMLField(),
      }),
      damage: new SchemaField({
        attack: new StringField({ required: true, blank: false, initial: "blade" }),
        parts: new artichron.data.fields.CollectionField(artichron.data.pseudoDocuments.damage.Damage),
      }),
      equipped: new SchemaField({
        armor: new SchemaField(Object.keys(artichron.config.EQUIPMENT_TYPES).reduce((acc, key) => {
          acc[key] = new StringField({ required: true });
          return acc;
        }, {})),
      }),
      favorites: new SetField(new StringField({ required: true })),
      health: new SchemaField({
        value: new NumberField({ min: 0, initial: 0, integer: true, nullable: false }),
      }, {
        trackedAttribute: true,
      }),
      pips: new SchemaField({
        value: new NumberField({ min: 0, initial: 0, step: 0.2, nullable: false }),
        turn: new NumberField({ min: 0, initial: 1, step: 1, nullable: false }),
      }),
    });
  }

  /* -------------------------------------------------- */
  /*   Data preparation                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareBaseData() {
    super.prepareBaseData();
    this.defenses = {};
    for (const { value } of artichron.config.DAMAGE_TYPES.optgroups) this.defenses[value] = 0;

    // Prepare attack and damage.
    const attack = this.damage.attack in artichron.config.BASIC_ATTACKS.melee.types
      ? artichron.config.BASIC_ATTACKS.melee.types[this.damage.attack]
      : artichron.config.BASIC_ATTACKS.range.types[this.damage.attack];
    this.damage.label = attack.label;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.#prepareDefenses();
    this.#prepareBonuses();
  }

  /* -------------------------------------------------- */

  /** Prepare the value of actor defenses. */
  #prepareDefenses() {
    for (const item of Object.values(this.parent.armor)) {
      if (!item?.fulfilledRequirements) continue;
      for (const [k, v] of Object.entries(item.system.defenses)) {
        this.defenses[k] += v.value;
      }
    }
  }

  /* -------------------------------------------------- */

  /**
   * Prepare damage bonuses derived from statuses and defenses from statuses.
   */
  #prepareBonuses() {
    this.modifiers = {};
    for (const k of Object.keys(artichron.config.DAMAGE_TYPE_GROUPS)) {
      this.modifiers[k] = {};
      let mult = 1;
      if (this.parent.statuses.has(`${k.slice(0, 4)}AtkUp`)) mult = 3 / 2;
      if (this.parent.statuses.has(`${k.slice(0, 4)}AtkDown`)) mult = mult ? 0 : 2 / 3;
      this.modifiers[k].damage = mult;

      mult = 1;
      if (this.parent.statuses.has(`${k.slice(0, 4)}DefUp`)) mult = 3 / 2;
      if (this.parent.statuses.has(`${k.slice(0, 4)}DefDown`)) mult = mult ? 0 : 2 / 3;
      this.modifiers[k].defense = mult;
    }
  }

  /* -------------------------------------------------- */
  /*   Life-cycle methods                               */
  /* -------------------------------------------------- */

  /**
   * Modify the update to the system data model.
   * @param {object} update     The update to any system-specific properties.
   * @param {object} options    The update options.
   * @param {User} user         The user performing the update.
   */
  async _preUpdate(update, options, user) {
    const allowed = await super._preUpdate(update, options, user);
    if (allowed === false) return false;
    const health = update.system?.health ?? {};
    if ("value" in health) {
      health.value = Math.clamp(health.value, 0, this.health.max);
      options.health = { o: this.health.value };
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);

    if (options.health) {
      options.health.n = this.health.value;
      options.health.delta = options.health.n - options.health.o;
    }

    if (game.user.id === userId) {
      const pct = this.parent.system.health.pct;
      this.parent.toggleStatusEffect("bloodied", { active: (pct > 20) && (pct <= 50) });
      this.parent.toggleStatusEffect("critical", { active: (pct > 0) && (pct <= 20) });
      this.parent.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, { active: !pct, overlay: true });
    }
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The currently equipped armor set.
   * @type {object}
   */
  get armor() {
    const items = this.equipped.armor;
    return Object.keys(artichron.config.EQUIPMENT_TYPES).reduce((acc, k) => {
      const item = this.parent.items.get(items[k]) ?? null;
      acc[k] = ((item?.type === "armor") && (item.system.category.subtype === k)) ? item : null;
      return acc;
    }, {});
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Call a dialog to change the item equipped in a particular slot.
   * @param {string} slot   The slot to change.
   * @returns {Promise}
   */
  async changeEquippedDialog(slot) {
    const current = this.parent.items.get(this.equipped.armor[slot]);
    const choices = this.parent.items.reduce((acc, item) => {
      if (item === current) return acc;
      if ((item.type !== "armor") || (item.system.category.subtype !== slot)) return acc;
      acc[item.id] = item.name;
      return acc;
    }, {});

    const content = !foundry.utils.isEmpty(choices) ? new foundry.data.fields.StringField({
      choices: choices,
      required: true,
      label: "ARTICHRON.EquipDialog.Label",
      hint: "ARTICHRON.EquipDialog.Hint",
    }).toFormGroup({ localize: true }, { name: "itemId" }).outerHTML : null;

    const buttons = [];
    if (!foundry.utils.isEmpty(choices)) {
      buttons.push({
        action: "equip",
        label: "Confirm",
        icon: "fa-solid fa-check",
        callback: (event, button, html) => button.form.elements.itemId.value,
      });
    }

    if (current) {
      buttons.push({
        action: "unequip",
        label: "Unequip",
        icon: "fa-solid fa-times",
      });
    }

    if (!buttons.length) {
      ui.notifications.warn("ARTICHRON.EquipDialog.Warning", { localize: true });
      return null;
    }

    const value = await artichron.applications.api.Dialog.wait({
      buttons: buttons,
      content: content ? `<fieldset>${content}</fieldset>` : undefined,
      classes: ["equip"],
      modal: true,
      window: { title: "ARTICHRON.EquipDialog.Title", icon: "fa-solid fa-hand-fist" },
      position: { width: 350 },
    });

    if (!value) return null;

    if (value === "unequip") {
      return this.changeEquipped(slot);
    }

    const item = this.parent.items.get(value);
    return this.changeEquipped(slot, item);
  }

  /* -------------------------------------------------- */

  /**
   * Change the item equipped in a particular slot.
   * @param {string} slot                 The slot to change equipment in.
   * @param {ItemArtichron} [item]        An optional item to equip in the given slot.
   * @returns {Promise<ActorArtichron>}   A promise that resolves to the updated actor.
   */
  async changeEquipped(slot, item = null) {
    const path = `system.equipped.armor.${slot}`;
    const update = { [path]: item ? item.id : "" };
    await this.parent.update(update);
    return this.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Perform the full damage roll workflow.
   * @param {object} [config={}]    Roll configuration object.
   * @param {object} [dialog={}]    Dialog configuration object.
   * @param {object} [message={}]   Message configuration object.
   * @returns {Promise<artichron.dice.rolls.DamageRoll[]|null>}   A promise that resolves to the evaluated rolls.
   */
  async rollDamage(config = {}, dialog = {}, message = {}) {

    const rollConfigs = config.rollConfigs ?? [];
    config = foundry.utils.mergeObject({
      rollData: this.parent.getRollData(),
      subject: this.parent,
      rollConfigs: this.#configureDamageRollConfigs(),
    }, config, { overwrite: false });
    for (const rollConfig of rollConfigs) {
      const existing = config.rollConfigs.find(c => c.damageType === rollConfig.damageType);
      if (existing) existing.parts.push(...rollConfig.parts);
      else config.rollConfigs.push(rollConfig);
    }

    dialog = foundry.utils.mergeObject({
      bypass: config.event?.shiftKey === true,
    }, dialog);

    message = foundry.utils.mergeObject({
      bypass: false,
    }, message);

    const flow = new artichron.dice.DamageRollFlow(config, dialog, message);
    return flow.finalize();
  }

  /* -------------------------------------------------- */

  /**
   * Configure roll configs for a damage roll flow.
   * @returns {object[]}
   */
  #configureDamageRollConfigs() {
    const parts = [];
    for (const part of this.damage.parts) {
      parts.push({
        parts: [part.formula],
        damageType: part.damageType,
        damageTypes: [...part.damageTypes],
        modifiers: {
          physical: this.modifiers.physical.damage,
          elemental: this.modifiers.elemental.damage,
          planar: this.modifiers.planar.damage,
        },
      });
    }
    return parts;
  }

  /* -------------------------------------------------- */

  /**
   * Calculate damage that will be taken, excepting any defenses from parrying and blocking.
   * @param {number|DamageDescription[]} damages    Damage to be applied.
   * @param {object} [options]                      Damage calculation options.
   * @param {boolean} [options.numeric]             Whether to return the damage descriptions instead of the total damage.
   * @returns {number|DamageDescription[]}          The amount of damage taken, or the modified values.
   */
  calculateDamage(damages, { numeric = true } = {}) {
    if (foundry.utils.getType(damages) === "number") {
      damages = [{ type: "none", value: damages }];
    }
    damages = foundry.utils.deepClone(damages);

    // Values are cloned so we can prevent double-dipping.
    const defenses = foundry.utils.deepClone(this.defenses);

    const resisted = damage => {
      if (damage.options?.irreducible) return;
      if (!(damage.type in artichron.config.DAMAGE_TYPES)) return;

      const diff = Math.min(damage.value, defenses[damage.type]);
      defenses[damage.type] = defenses[damage.type] - diff;
      damage.value = damage.value - diff;

      // Divide by defensive buffs.
      damage.value = (damage.value / this.modifiers[artichron.config.DAMAGE_TYPES[damage.type].group].defense).toNearest(1);
    };

    damages = damages.filter(damage => {
      resisted(damage);
      return damage.value > 0;
    });

    return numeric ? damages.reduce((acc, damage) => acc + damage.value, 0) : damages;
  }

  /* -------------------------------------------------- */

  /**
   * Apply damage to this actor.
   * @param {number|DamageDescription[]} damages    Damage to be applied.
   * @returns {Promise<ActorArtichron>}             A promise that resolves to the updated actor.
   */
  async applyDamage(damages) {
    if (!this.health.value) return this;

    damages = this.calculateDamage(damages, { numeric: false });

    // The statuses to apply.
    const statuses = new Map();
    const statused = damage => {
      if (foundry.utils.isEmpty(damage.statuses)) return;
      for (const [status, level] of Object.entries(damage.statuses)) {
        if (!statuses.has(status)) statuses.set(status, level);
        else statuses.set(status, Math.max(statuses.get(status), level));
      }
    };
    damages = damages.filter(damage => damage.value > 0);
    for (const damage of damages) statused(damage);

    const total = damages.reduce((acc, damage) => acc + damage.value, 0);
    const hp = foundry.utils.deepClone(this.health);
    const value = Math.clamp(hp.value - Math.max(0, total), 0, hp.max);
    await this.parent.update({ "system.health.value": value }, { damages: damages, diff: false });

    // Apply conditions from applied damage.
    for (const [status, level] of statuses.entries()) await this.parent.toggleStatusEffect(status, { levels: level });

    return this.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Apply healing to this actor.
   * @param {number} value                The amount to heal.
   * @returns {Promise<ActorArtichron>}   This actor after having been healed.
   */
  async applyHealing(value) {
    const hp = foundry.utils.deepClone(this.health);
    const v = Math.clamp(hp.value + Math.abs(value), 0, hp.max);
    await this.parent.update({ "system.health.value": v }, { diff: false });
    return this.parent;
  }
}
