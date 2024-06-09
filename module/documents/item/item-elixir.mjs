import {FormulaField} from "../fields/formula-field.mjs";
import {ItemSystemModel} from "./system-model.mjs";

const {SchemaField, NumberField, StringField} = foundry.data.fields;

export default class ElixirData extends ItemSystemModel {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    inventorySection: "consumables",
    defaultIcon: "icons/svg/explosion.svg"
  }, {inplace: false}));

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new SchemaField({
        value: new NumberField({
          initial: 1,
          minimum: 0,
          integer: true,
          nullable: true,
          label: "ARTICHRON.ItemProperty.Quantity.Value",
          hint: "ARTICHRON.ItemProperty.Quantity.ValueHint"
        })
      }),
      usage: new SchemaField({
        value: new NumberField({
          integer: true,
          min: 0,
          initial: 1,
          label: "ARTICHRON.ItemProperty.Usage.Value",
          hint: "ARTICHRON.ItemProperty.Usage.ValueHint"
        }),
        max: new FormulaField({
          required: true,
          initial: "1",
          label: "ARTICHRON.ItemProperty.Usage.Max",
          hint: "ARTICHRON.ItemProperty.Usage.MaxHint"
        })
      }),
      category: new SchemaField({
        subtype: new StringField({
          label: "ARTICHRON.ItemProperty.Category.SubtypeElixir",
          hint: "ARTICHRON.ItemProperty.Category.SubtypeElixirHint",
          choices: CONFIG.SYSTEM.ELIXIR_TYPES
        })
      })
    };
  }

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.usage.max"
    ]));
  }

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
  }

  /** @override */
  preparePostData() {
    super.preparePostData();
    const rollData = this.parent.getRollData();

    // Prepare max usage of the elixir.
    this.usage.max = artichron.utils.simplifyBonus(this.usage.max, rollData);
  }

  /** @override */
  async use() {
    if (!this.hasUses) {
      ui.notifications.warn("ARTICHRON.ElixirDialog.WarningUsage", {localize: true});
      return null;
    }

    if (!this.hasEffects) {
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

    const update = {};
    if (this.usage.value - 1 === 0) {
      update["system.usage.value"] = this.usage.max;
      update["system.quantity.value"] = this.quantity.value - 1;
    } else {
      update["system.usage.value"] = this.usage.value - 1;
    }

    return Promise.all([
      this.parent.update(update),
      getDocumentClass("ActiveEffect").create(effectData, {parent: this.parent.actor})
    ]);
  }

  /**
   * Does this item have a limited number of uses?
   * @type {boolean}
   */
  get hasUses() {
    const use = this.usage;
    const qty = this.quantity;
    return (use.max > 0) && (qty.value > 0) && (use.value > 0);
  }

  /**
   * The effects that can be transferred to the actor when this item is used.
   * @type {ActiveEffectArtichron[]}
   */
  get transferrableEffects() {
    return this.parent.effects.filter(e => !e.transfer);
  }

  /**
   * Does this item have any effects that can be transferred to the actor when this item is used?
   * @type {boolean}
   */
  get hasEffects() {
    return this.hasUses && (this.transferrableEffects.length > 0);
  }
}
