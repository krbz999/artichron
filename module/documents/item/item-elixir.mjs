import ItemSystemModel from "./system-model.mjs";

const {SchemaField, NumberField, StringField} = foundry.data.fields;

export default class ElixirData extends ItemSystemModel {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    inventorySection: "consumables",
    type: "elixir"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new SchemaField({
        value: new NumberField({
          initial: 1,
          min: 0,
          integer: true,
          nullable: true,
          label: "ARTICHRON.ItemProperty.Quantity.Value",
          hint: "ARTICHRON.ItemProperty.Quantity.ValueHint"
        })
      }),
      usage: new SchemaField({
        spent: new NumberField({
          integer: true,
          min: 0,
          initial: 1,
          label: "ARTICHRON.ItemProperty.Usage.Spent",
          hint: "ARTICHRON.ItemProperty.Usage.SpentHint"
        }),
        max: new NumberField({
          min: 1,
          integer: true,
          initial: 1,
          nullable: false,
          label: "ARTICHRON.ItemProperty.Usage.Max",
          hint: "ARTICHRON.ItemProperty.Usage.MaxHint"
        })
      }),
      category: new SchemaField({
        subtype: new StringField({
          required: true,
          label: "ARTICHRON.ItemProperty.Category.SubtypeElixir",
          hint: "ARTICHRON.ItemProperty.Category.SubtypeElixirHint",
          initial: "buff",
          choices: CONFIG.SYSTEM.ELIXIR_TYPES
        }),
        pool: new StringField({
          required: true,
          initial: "health",
          choices: {
            health: "ARTICHRON.ItemProperty.Category.PoolElixirChoiceHealth",
            stamina: "ARTICHRON.ItemProperty.Category.PoolElixirChoiceStamina",
            mana: "ARTICHRON.ItemProperty.Category.PoolElixirChoiceMana"
          }
        })
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

    if (this.isBuffElixir) return this.#useBuff();
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
          acc[e.id] = e.name;
          return acc;
        }, {})
      })
    };

    const render = (event, html) => {
      const button = html.querySelector("button[type=submit]");
      html.querySelector("SELECT").addEventListener("change", (event) => {
        button.disabled = !event.currentTarget.value;
      });
    };

    const effectId = await foundry.applications.api.DialogV2.prompt({
      content: await renderTemplate("systems/artichron/templates/item/elixir-dialog.hbs", context),
      rejectClose: false,
      modal: true,
      render: render,
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
    if (!effectId) return null;

    const effect = this.parent.effects.get(effectId);
    const effectData = foundry.utils.mergeObject(effect.toObject(), {
      transfer: false,
      "-=duration": null,
      disabled: false,
      "system.source": this.parent.uuid,
      "system.granted": true
    }, {performDeletions: true});

    const update = this._usageUpdate();

    return Promise.all([
      this.parent.update(update),
      getDocumentClass("ActiveEffect").create(effectData, {parent: this.parent.actor}),
      this.parent.actor.inCombat ? this.parent.actor.spendActionPoints(1) : null
    ]);
  }

  /* -------------------------------------------------- */

  /**
   * Use a 'restorative' type elixir.
   * @returns {Promise}
   */
  async #useRestorative() {
    const type = this.category.pool;
    const title = `ARTICHRON.ElixirDialog.TitleRestore${type.capitalize()}`;
    const confirm = await foundry.applications.api.DialogV2.confirm({
      rejectClose: false,
      modal: true,
      window: {
        title: title,
        icon: "fa-solid fa-flask"
      },
      position: {
        width: 400,
        height: "auto"
      }
    });
    if (!confirm) return;

    const rollData = this.parent.getRollData();
    const formula = `1@pools.${type}.die`;
    const roll = await Roll.create(formula, rollData).evaluate();
    const update = this._usageUpdate();

    // TODO: What is actually restored here?
  }

  /* -------------------------------------------------- */

  /**
   * Utility method for crafting the usage update for an elixir.
   * @param {number} [uses]     The uses to subtract.
   * @returns {object}
   */
  _usageUpdate(uses = 1) {
    if (uses > this.usage.value) throw new Error("Attempting to subtract too many uses.");
    const update = {_id: this.parent.id};
    const value = this.usage.spent + uses;
    if (value === this.usage.max) {
      update["system.usage.spent"] = 0;
      update["system.quantity.value"] = this.quantity.value - 1;
    } else {
      update["system.usage.spent"] = value;
    }
    return update;
  }

  /* -------------------------------------------------- */

  /**
   * Does this item have a limited number of uses?
   * @type {boolean}
   */
  get hasUses() {
    const use = this.usage;
    const qty = this.quantity;
    return (use.max > 0) && (qty.value > 0);
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

  /* -------------------------------------------------- */

  /**
   * Is this a buff elixir?
   * @type {boolean}
   */
  get isBuffElixir() {
    return this.category.subtype === "buff";
  }
}
