import ActivitySelectDialog from "../../applications/item/activity-select-dialog.mjs";
import {ActivitiesField} from "../fields/activity-field.mjs";
import IdentifierField from "../fields/identifier-field.mjs";

const {StringField, SchemaField, HTMLField, NumberField, SetField} = foundry.data.fields;

export default class ItemSystemModel extends foundry.abstract.TypeDataModel {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze({
    defaultWeight: 1,
    fusion: false,
    inventorySection: "",
    order: 10,
    type: ""
  });

  /* -------------------------------------------------- */

  /**
   * Create an instance of this data model extended by several mixins.
   * @param {...function} templateMethods     The mixin methods.
   * @returns {typeof ItemSystemModel}        A subclass of this data model.
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
      identifier: new IdentifierField(),
      weight: new SchemaField({
        value: new NumberField({min: 0, step: 0.1, initial: () => this.metadata.defaultWeight, nullable: false})
      }),
      price: new SchemaField({
        value: new NumberField({min: 0, initial: 0, integer: true, nullable: false})
      }),
      activities: new ActivitiesField(),
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
   * Perform the function of an activity of this item.
   * @returns {Promise}
   */
  async use() {
    const activities = this.activities;
    if (!activities.size) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoActivities", {localize: true});
      return;
    }

    let activity;
    if (activities.size === 1) activity = activities.contents[0];
    else {
      const configuration = await ActivitySelectDialog.create(this.parent);
      if (configuration) activity = activities.get(configuration.activity);
    }

    if (activity) return activity.use();
    return null;
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
    context.propsCol = Math.min(4, context.properties.length);

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
      if (this.wield.value === 1) tags.push({label: "One-Handed"});
      else tags.push({label: "Two-Handed"});
    }

    const valid = this.constructor._attributeChoices();
    for (const attribute of this.attributes.value) {
      const label = valid[attribute]?.label;
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
      props.push({title: "Qty", label: this.quantity.value ?? 0, icon: "fa-solid fa-cubes-stacked"});
    }

    return props;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.ITEM"];

  /* -------------------------------------------------- */

  /**
   * The effects that can be transferred to the actor when this item is used.
   * @type {ActiveEffectArtichron[]}
   */
  get transferrableEffects() {
    return this.parent.effects.filter(e => !e.transfer && ["condition", "buff"].includes(e.type));
  }

  /* -------------------------------------------------- */

  /**
   * Does this item have any effects that can be transferred to the actor when this item is used?
   * @type {boolean}
   */
  get hasTransferrableEffects() {
    return this.transferrableEffects.length > 0;
  }

  /* -------------------------------------------------- */

  /**
   * Properties that can be amplified by a fused item.
   * @type {Set<string>}
   */
  static get BONUS_FIELDS() {
    return new Set([
      "name",
      "img",
      "activity",
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
    if (!this.identifier) this.identifier = this.parent.name.slugify({strict: true});
  }
}
