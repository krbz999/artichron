import {CategoryField} from "../fields/category-field.mjs";
import {FormulaField} from "../fields/formula-field.mjs";
import {QuantityField} from "../fields/quantity-field.mjs";
import {ItemSystemModel} from "./system-model.mjs";

const {SchemaField, NumberField} = foundry.data.fields;

export default class ElixirData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new QuantityField(),
      usage: new SchemaField({
        value: new NumberField({
          integer: true,
          min: 0,
          initial: null,
          label: "ARTICHRON.ItemProperty.UsageValue"
        }),
        max: new FormulaField({
          required: true,
          label: "ARTICHRON.ItemProperty.UsageMax"
        })
      }, {label: "ARTICHRON.ItemProperty.Usage"}),
      category: new CategoryField({
        label: "ARTICHRON.ItemProperty.ElixirType",
        choices: CONFIG.SYSTEM.ELIXIR_TYPES
      })
    };
  }

  /** @override */
  get BONUS_FIELDS() {
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
    const config = {
      effect: this.hasEffects,
      usage: this.hasUses
    };

    if (!Object.values(config).some(s => s)) return null;

    const configuration = await Dialog.wait({
      content: await renderTemplate("systems/artichron/templates/chat/item-use.hbs", config),
      buttons: {
        ok: {
          label: game.i18n.localize("ARTICHRON.OK"),
          icon: "<i class='fa-solid fa-check'></i>",
          callback: ([html]) => new FormDataExtended(html.querySelector("FORM")).object
        },
        cancel: {
          label: game.i18n.localize("Cancel"),
          icon: "<i class='fa-solid fa-times'></i>",
          callback: () => null
        }
      },
      title: game.i18n.format("ARTICHRON.ItemConfiguration", {name: this.parent.name}),
      close: () => null
    });

    if (!configuration) return null;
    foundry.utils.mergeObject(config, configuration);

    if (config.effect) {
      const effects = this.transferrableEffects.map(effect => {
        const data = effect.toObject();
        delete data.transfer;
        delete data.duration.startTime;
        delete data.disabled;
        return data;
      });
      await this.parent.actor.createEmbeddedDocuments("ActiveEffect", effects);
    }
    if (config.usage) {
      const usage = this.usage;
      const update = {};
      if (usage.value - 1 === 0) {
        update["system.usage.value"] = usage.max;
        update["system.quantity.value"] = this.quantity.value - 1;
      } else {
        update["system.usage.value"] = usage.value - 1;
      }
      await this.parent.update(update);
    }
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
