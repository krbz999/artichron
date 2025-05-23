import ActorSystemModel from "./system-model.mjs";

const {
  NumberField, SchemaField, SetField, StringField,
} = foundry.data.fields;

/**
 * Extended data model for actor types that participate in combat.
 * These actor types also have health and can make use of equipment.
 */
export default class CreatureData extends ActorSystemModel {
  /** @inheritdoc */
  static defineSchema() {
    const schema = super.defineSchema();

    schema.health = new SchemaField({
      value: new NumberField({ min: 0, initial: 0, integer: true, nullable: false }),
    }, {
      trackedAttribute: true,
    });

    schema.pips = new SchemaField({
      value: new NumberField({ min: 0, initial: 0, step: 0.2, nullable: false }),
      turn: new NumberField({ min: 0, initial: 1, step: 1, nullable: false }),
    });

    schema.favorites = new SetField(new StringField({ required: true }));
    schema.equipped = new SchemaField({
      arsenal: new SchemaField({
        primary: new StringField({ required: true }),
        secondary: new StringField({ required: true }),
      }),
      armor: new SchemaField(Object.keys(artichron.config.EQUIPMENT_TYPES).reduce((acc, key) => {
        acc[key] = new StringField({ required: true });
        return acc;
      }, {})),
    });

    return schema;
  }

  /* -------------------------------------------------- */
  /*   Data preparation                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareBaseData() {
    super.prepareBaseData();
    this.bonuses = { damage: {} };
    this.defenses = {};
    for (const k of Object.keys(artichron.config.DAMAGE_TYPE_GROUPS)) this.bonuses.damage[k] = 0;
    for (const { value } of artichron.config.DAMAGE_TYPES.optgroups) this.defenses[value] = 0;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    // Calling super first to prepare actor level.
    super.prepareDerivedData();
    this.#prepareDefenses();
    this.#prepareDamageBonuses();
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

  /** Prepare damage bonuses derived from statuses. */
  #prepareDamageBonuses() {
    for (const k of Object.keys(artichron.config.DAMAGE_TYPE_GROUPS)) {
      let mult = 0;
      if (this.parent.statuses.has(`${k.slice(0, 4)}AtkUp`)) mult = 50;
      if (this.parent.statuses.has(`${k.slice(0, 4)}AtkDown`)) mult = mult ? 0 : -33;
      if (mult) this.bonuses.damage[k] += mult;
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

  /** @inheritdoc */
  static get BONUS_FIELDS() {
    const bonus = super.BONUS_FIELDS;
    bonus.add("system.pips.turn");
    for (const k of Object.keys(artichron.config.DAMAGE_TYPE_GROUPS)) {
      bonus.add(`system.bonuses.damage.${k}`);
    }
    for (const k of Object.keys(artichron.config.DAMAGE_TYPES)) {
      bonus.add(`system.defenses.${k}`);
    }
    return bonus;
  }

  /* -------------------------------------------------- */

  /**
   * The currently equipped arsenal.
   * @type {{primary: ItemArtichron, secondary: ItemArtichron}}
   */
  get arsenal() {
    const items = this.equipped.arsenal;
    let primary = this.parent.items.get(items.primary) ?? null;
    if (!primary?.isArsenal) primary = null;
    let secondary = this.parent.items.get(items.secondary) ?? null;
    if (!secondary?.isArsenal || (primary?.isTwoHanded || secondary.isTwoHanded)) secondary = null;
    return { primary, secondary };
  }

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

  /**
   * Does this actor have a shield equipped?
   * @type {boolean}
   */
  get hasShield() {
    const { primary, secondary } = this.arsenal;
    return (primary?.type === "shield") || (secondary?.type === "shield");
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
    const type = ["primary", "secondary"].includes(slot) ? "arsenal" : "armor";
    const current = this.parent.items.get(this.equipped[type][slot]);
    const choices = this.parent.items.reduce((acc, item) => {
      if (item === current) return acc;

      if (type === "armor") {
        if ((item.type !== "armor") || (item.system.category.subtype !== slot)) return acc;
      } else if (type === "arsenal") {
        if (!item.isArsenal) return acc;
        const { primary, secondary } = this.parent.arsenal;
        if ([primary, secondary].includes(item)) return acc;
        if (slot === "secondary") {
          if (item.isTwoHanded) return acc;
          if (primary?.isTwoHanded) return acc;
        }
      }

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
    const type = ["primary", "secondary"].includes(slot) ? "arsenal" : "armor";
    const path = `system.equipped.${type}.${slot}`;
    const current = foundry.utils.getProperty(this.parent, path);
    const update = { [path]: item ? item.id : "" };
    if ((type === "arsenal") && (slot === "primary") && (item !== current) && item?.isTwoHanded) {
      update[path.replace(slot, "secondary")] = "";
    }

    await this.parent.update(update);
    return this.parent;
  }
}
