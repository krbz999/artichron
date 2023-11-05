import {ItemSystemModel} from "./system-model.mjs";

export default class ElixirData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      quantity: new fields.SchemaField({
        value: new fields.NumberField({min: 0, integer: true, initial: 1})
      }),
      usage: new fields.SchemaField({
        value: new fields.NumberField({integer: true, min: 0, initial: null}),
        max: new fields.StringField({initial: ""})
      })
    };
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this._prepareUsage();
  }

  /**
   * Prepare max usage of the elixir.
   */
  _prepareUsage() {
    const us = this.usage;
    if (us.max) us.max = artichron.utils.simplifyFormula(us.max, this.parent.getRollData());
  }

  async use() {
    const config = {
      effect: this.hasEffects,
      usage: this.hasUsages
    };

    if(!Object.values(config).some(s => s)) return null;

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
      close: () => null,
      rejectClose: false
    }, {rejectClose: false});

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
  get hasUsages() {
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
    return this.hasUsages && (this.transferrableEffects.length > 0);
  }
}
