const {StringField, SchemaField, HTMLField, NumberField, SetField} = foundry.data.fields;

export class ItemSystemModel extends foundry.abstract.TypeDataModel {
  /**
   * An object of metadata.
   * @type {object}
   */
  static metadata = Object.freeze({
    inventorySection: "",
    fusion: false
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
        value: new HTMLField({
          label: "ARTICHRON.ItemProperty.Description.Value",
          hint: "ARTICHRON.ItemProperty.Description.ValueHint",
          required: true
        })
      }),
      weight: new SchemaField({
        value: new NumberField({
          min: 0,
          nullable: true,
          step: 0.25,
          label: "ARTICHRON.ItemProperty.Weight.Value",
          hint: "ARTICHRON.ItemProperty.Weight.ValueHint"
        })
      }),
      price: new SchemaField({
        value: new NumberField({
          min: 0,
          initial: null,
          integer: true,
          label: "ARTICHRON.ItemProperty.Price.Value",
          hint: "ARTICHRON.ItemProperty.Price.ValueHint"
        })
      }),
      attributes: new SchemaField({
        value: new SetField(new StringField({
          choices: () => this._attributeChoices()
        }), {
          label: "ARTICHRON.ItemProperty.Attributes.Value",
          hint: "ARTICHRON.ItemProperty.Attributes.ValueHint"
        })
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

  async _preCreate(data, options, user) {
    const update = {};

    // Set default attributes per item type.
    const attr = new Set(data.system?.attributes?.value ?? []);
    if (data.type === "spell") attr.add("magical");
    else if (data.type === "shield") attr.add("blocking");
    else if (data.type === "weapon") attr.add("parrying");
    update["system.attributes.value"] = attr;

    this.parent.updateSource(update);

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
  /*   Properties                                       */
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
    if (!this.parent.isEmbedded) this.preparePostData();
  }

  /* -------------------------------------------------- */

  /**
   * Preparation method for any data that depends on prepared actor data. Called after all data
   * preparation if the item is owned, otherwise at the end of `prepareDerivedData`.
   */
  preparePostData() {}
}
