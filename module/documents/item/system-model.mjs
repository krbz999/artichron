const {StringField, SchemaField, HTMLField, NumberField, SetField} = foundry.data.fields;

export default class ItemSystemModel extends foundry.abstract.TypeDataModel {
  /**
   * An object of metadata.
   * @type {object}
   */
  static metadata = Object.freeze({
    inventorySection: "",
    fusion: false,
    defaultWeight: 1
  });

  /* -------------------------------------------------- */

  /**
   * Create an instance of this data model extended by several mixins.
   * @param {...function} templateMethods     The mixin methods.
   * @returns {Class}                         A subclass of this data model.
   */
  static mixin(...templateMethods) {
    return templateMethods.reduce((acc, fn) => fn(acc), this);
  }

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      description: new SchemaField({
        value: new HTMLField({required: true})
      }),
      weight: new SchemaField({
        value: new NumberField({min: 0, step: 0.1, initial: () => this.metadata.defaultWeight})
      }),
      price: new SchemaField({
        value: new NumberField({min: 0, initial: null, integer: true})
      }),
      attributes: new SchemaField({
        value: new SetField(new StringField({
          choices: () => this._attributeChoices()
        }))
      })
    };
  }

  /* -------------------------------------------------- */

  /**
   * Create the choices for the attributes fieldset of this item type.
   * @returns {object}      Filtered choices from 'SYSTEM.ITEM_ATTRIBUTES'.
   */
  static _attributeChoices() {
    const choices = {};
    const type = this.metadata.type;
    for (const [k, v] of Object.entries(CONFIG.SYSTEM.ITEM_ATTRIBUTES)) {
      if (!v.types?.size || v.types.has(type)) choices[k] = v;
    }
    return choices;
  }

  /* -------------------------------------------------- */
  /*   Life-cycle methods                               */
  /* -------------------------------------------------- */

  /** @override */
  async _preCreate(data, options, user) {
    return super._preCreate(data, options, user);
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Perform the item's type-specific main function.
   * @returns {Promise}
   */
  async use() {
    throw new Error("Subclasses of the Item System Data Model must override the #use method.");
  }

  /* -------------------------------------------------- */

  /**
   * Unequip this item.
   * @returns {Promise<ItemArtichron|null>}
   */
  async unequip() {
    if (!this.parent.isEquipped) return null;
    const actor = this.parent.actor;
    if (this.parent.isArsenal) {
      const a = actor.arsenal;
      for (const [k, v] of Object.entries(a)) {
        if (v === this.parent) {
          await actor.update({[`system.equipped.arsenal.${k}`]: ""});
          return this.parent;
        }
      }
    } else if (this.parent.type === "armor") {
      const a = actor.armor;
      for (const [k, v] of Object.entries(a)) {
        if (v === this.parent) {
          await actor.update({[`system.equipped.armor.${k}`]: ""});
          return this.parent;
        }
      }
    }
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve an object for roll data.
   * @returns {object}
   */
  getRollData() {
    return {...this};
  }

  /* -------------------------------------------------- */
  /*   Tooltips                                         */
  /* -------------------------------------------------- */

  /**
   * Create data for an enriched tooltip.
   * @returns {Promise<HTMLElement>}
   */
  async richTooltip() {
    const template = "systems/artichron/templates/item/tooltip.hbs";
    const context = await this._prepareTooltipContext();
    const div = document.createElement("DIV");
    div.innerHTML = await renderTemplate(template, context);
    div.classList.add(this.parent.type);
    return div;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context object for this item's tooltip.
   * @returns {Promise<object>}
   */
  async _prepareTooltipContext() {
    const item = this.parent;
    const rollData = this.parent.getRollData();
    const description = await TextEditor.enrichHTML(this.description.value, {rollData: rollData, relativeTo: item});

    const context = {
      item: item,
      rollData: rollData,
      description: description,
      subtitle: game.i18n.localize(`TYPES.Item.${this.parent.type}`),
      tags: this._prepareTooltipTags(),
      properties: this._prepareTooltipProperties()
    };

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare tags for item tooltips.
   * @returns {object[]}
   */
  _prepareTooltipTags() {
    const tags = [];

    if (this.parent.isArsenal) {
      if (this.parent.isMelee) tags.push({label: "Melee"});
      else tags.push({label: "Ranged"});

      if (this.wield.value === 1) tags.push({label: "One-Handed"});
      else tags.push({label: "Two-Handed"});
    }

    for (const attribute of this.attributes.value) {
      const label = CONFIG.SYSTEM.ITEM_ATTRIBUTES[attribute]?.label;
      if (label) tags.push({label: label});
    }

    return tags;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare properties for item tooltips.
   * @returns {object[]}
   */
  _prepareTooltipProperties() {
    const props = [];

    props.push({title: "Price", label: this.price.value ?? 0, icon: "fa-solid fa-sack-dollar"});
    props.push({title: "Weight", label: this.weight.total, icon: "fa-solid fa-weight-hanging"});

    if (this.schema.has("quantity")) {
      props.push({title: "Quantity", label: this.quantity.value ?? 0, icon: "fa-solid fa-cubes-stacked"});
    }

    if (this.parent.isArsenal) {
      if (this.parent.isMelee) props.push({title: "Reach", label: `${this.range.reach}m`, icon: "fa-solid fa-bullseye"});
      else props.push({title: "Range", label: `${this.range.value}m`, icon: "fa-solid fa-bullseye"});
    }

    return props;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.SharedProperty",
    "ARTICHRON.ItemProperty"
  ];

  /* -------------------------------------------------- */

  /**
   * Properties that can be amplified by a fused item.
   * @type {Set<string>}
   */
  static get BONUS_FIELDS() {
    return new Set([
      "name",
      "img",
      "system.description.value",
      "system.price.value",
      "system.weight.value",
      "system.attributes.value"
    ]);
  }

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    this.weight.total = this.weight.value * (this.quantity?.value ?? 1);
  }
}
