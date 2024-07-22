import ItemSystemModel from "./system-model.mjs";

const {SchemaField, NumberField, StringField} = foundry.data.fields;

export default class ElixirData extends ItemSystemModel {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    inventorySection: "consumables",
    type: "elixir",
    defaultWeight: 0.5
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new SchemaField({
        value: new NumberField({initial: 1, min: 0, integer: true, nullable: true})
      }),
      usage: new SchemaField({
        spent: new NumberField({integer: true, min: 0, initial: 0}),
        max: new NumberField({min: 1, integer: true, initial: 1, nullable: false})
      }),
      category: new SchemaField({
        subtype: new StringField({required: true, initial: "buff", choices: CONFIG.SYSTEM.ELIXIR_TYPES}),
        pool: new StringField({required: true, initial: "stamina", choices: CONFIG.SYSTEM.ELIXIR_BOOST_TYPES})
      }),
      healing: new SchemaField({
        formula: new StringField({required: true})
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    const bonus = super.BONUS_FIELDS;
    bonus.add("system.usage.max");
    return bonus;
  }

  /** @override */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ItemProperty.ElixirProperty"
  ];

  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.usage.value = Math.max(0, this.usage.max - this.usage.spent);
  }

  /* -------------------------------------------------- */

  /** @override */
  async use() {
    if (this.isBoostElixir) {
      ui.notifications.warn("ARTICHRON.ElixirDialog.WarningCannotUseBooster", {localize: true});
      return null;
    }

    if (!this.hasUses) {
      ui.notifications.warn("ARTICHRON.ElixirDialog.WarningUsage", {localize: true});
      return null;
    }

    if (!this.parent.actor.canPerformActionPoints(1)) {
      ui.notifications.warn("ARTICHRON.Warning.MissingActionPoints", {localize: true});
      return null;
    }

    if (this.category.subtype === "buff") return this.#useBuff();
    else if (this.category.subtype === "restorative") return this.#useRestorative();
  }

  /* -------------------------------------------------- */

  /**
   * Use a 'buff' type elixir.
   * @returns {Promise}
   */
  async #useBuff() {
    if (!this.hasTransferrableEffects) {
      ui.notifications.warn("ARTICHRON.ElixirDialog.WarningEffects", {localize: true});
      return null;
    }

    const context = {
      field: new foundry.data.fields.StringField({
        label: "ARTICHRON.ElixirDialog.Effect",
        hint: "ARTICHRON.ElixirDialog.EffectHint",
        choices: this.transferrableEffects.reduce((acc, e) => {
          acc[e.uuid] = e.name;
          return acc;
        }, {})
      })
    };

    const effectUuid = await foundry.applications.api.DialogV2.prompt({
      content: await renderTemplate("systems/artichron/templates/item/elixir-dialog.hbs", context),
      rejectClose: false,
      modal: true,
      position: {
        width: 400,
        height: "auto"
      },
      ok: {
        label: "ARTICHRON.ElixirDialog.Confirm",
        icon: "fa-solid fa-flask",
        callback: (event, button, html) => button.form.elements.effect.value
      },
      window: {
        title: game.i18n.format("ARTICHRON.ElixirDialog.Title", {name: this.parent.name}),
        icon: "fa-solid fa-flask"
      }
    });
    if (!effectUuid) return null;

    await Promise.all([
      this.parent.update(this._usageUpdate()),
      this.parent.actor.inCombat ? this.parent.actor.spendActionPoints(1) : null
    ]);

    const flags = {artichron: {usage: {effect: {uuid: effectUuid}}}};
    const messageData = {
      type: "usage",
      speaker: ChatMessage.implementation.getSpeaker({actor: this.parent.actor}),
      "system.item": this.parent.uuid,
      flags: flags
    };

    return ChatMessage.implementation.create(messageData);
  }

  /* -------------------------------------------------- */

  /**
   * Use a 'restorative' type elixir.
   * @returns {Promise}
   */
  async #useRestorative() {
    const confirm = await foundry.applications.api.DialogV2.confirm({
      rejectClose: false,
      modal: true,
      window: {
        title: "ARTICHRON.ElixirDialog.TitleRestore",
        icon: "fa-solid fa-flask"
      },
      position: {width: 400},
      yes: {default: true}
    });
    if (!confirm) return;

    await Promise.all([
      this.parent.update(this._usageUpdate(1, true)),
      this.parent.actor.inCombat ? this.parent.actor.spendActionPoints(1) : null
    ]);

    const rollData = this.parent.getRollData();
    const roll = await Roll.create(this.healing.formula, rollData).evaluate();
    const messageData = {
      type: "healing",
      rolls: [roll],
      speaker: ChatMessage.implementation.getSpeaker({actor: this.parent.actor}),
      flavor: game.i18n.localize("ARTICHRON.ElixirDialog.ChatFlavor")
    };
    return ChatMessage.implementation.create(messageData);
  }

  /* -------------------------------------------------- */

  /**
   * Utility method for crafting the usage update for an elixir.
   * @param {number} [uses]         The uses to subtract, or the value to set to.
   * @param {boolean} [isDelta]     Whether this modifies the current uses, or overrides the value.
   * @returns {object}
   */
  _usageUpdate(uses = 1, isDelta = true) {
    const update = {_id: this.parent.id};
    let spent;

    if (isDelta) {
      if (uses === 0) return update;
      const invalid = !uses.between(-this.usage.spent, this.usage.value);
      if (invalid) throw new Error(`You cannot subtract ${uses} uses from ${this.parent.name}`);
      spent = this.usage.spent + uses;
    } else {
      const invalid = !uses.between(0, this.usage.max);
      if (invalid) throw new Error(`You cannot set ${this.parent.name} to have ${uses} uses.`);
      spent = this.usage.max - uses;
    }

    if (spent === this.usage.max) {
      update["system.usage.spent"] = 0;
      update["system.quantity.value"] = this.quantity.value - 1;
    } else {
      update["system.usage.spent"] = spent;
    }
    return update;
  }

  /* -------------------------------------------------- */

  /**
   * Does this item have a limited number of uses remaining?
   * @type {boolean}
   */
  get hasUses() {
    const use = this.usage;
    const qty = this.quantity;
    return (use.value > 0) && (use.max > 0) && (qty.value > 0);
  }

  /* -------------------------------------------------- */

  /**
   * The effects that can be transferred to the actor when this item is used.
   * @type {ActiveEffectArtichron[]}
   */
  get transferrableEffects() {
    return this.parent.effects.filter(e => !e.transfer);
  }

  /* -------------------------------------------------- */

  /**
   * Does this item have any effects that can be transferred to the actor when this item is used?
   * @type {boolean}
   */
  get hasTransferrableEffects() {
    return this.hasUses && (this.transferrableEffects.length > 0);
  }

  /* -------------------------------------------------- */

  /**
   * Is this a boosting elixir?
   * @type {boolean}
   */
  get isBoostElixir() {
    return this.category.subtype === "booster";
  }
}
