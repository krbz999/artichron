const {
  HTMLField, NumberField, SchemaField, SetField, StringField, TypedObjectField,
} = foundry.data.fields;

export default class ItemSystemModel extends foundry.abstract.TypeDataModel {
  /** @type {import("../../_types").ItemSubtypeMetadata} */
  static get metadata() {
    return {
      defaultWeight: 1,
      embedded: {
        Activity: "system.activities",
        Advancement: "system.advancements",
      },
      fusion: false,
      icon: "",
      inventorySection: "",
      order: 10,
      type: "",
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      description: new SchemaField({
        value: new HTMLField({ required: true }),
      }),
      identifier: new artichron.data.fields.IdentifierField(),
      weight: new SchemaField({
        value: new NumberField({ min: 0, step: 0.01, initial: () => this.metadata.defaultWeight, nullable: false }),
      }),
      price: new SchemaField({
        value: new NumberField({ min: 0, initial: 0, integer: true, nullable: false }),
      }),
      activities: new artichron.data.fields.CollectionField(artichron.data.pseudoDocuments.activities.BaseActivity),
      advancements: new artichron.data.fields.CollectionField(artichron.data.pseudoDocuments.advancements.BaseAdvancement),
      attributes: new SchemaField({
        value: new SetField(new StringField({
          choices: () => this._attributeChoices(),
        })),
        levels: new TypedObjectField(new NumberField({
          min: 1, nullable: true, integer: true,
        }), { validateKey: key => {
          return Object.values(artichron.config.ITEM_ATTRIBUTES).some(attr => attr.status === key);
        } }),
      }),
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
    for (const [k, v] of Object.entries(artichron.config.ITEM_ATTRIBUTES)) {
      if (!v.types?.size || v.types.has(type)) choices[k] = v;
    }
    return choices;
  }

  /* -------------------------------------------------- */
  /*   Life-cycle methods                               */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    const result = await super._preCreate(data, options, user);
    if (result === false) return false;

    if (!this.identifier) {
      this.parent.updateSource({ "system.identifier": this.parent.name.slugify({ strict: true }) });
    }
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Perform the function of an activity of this item.
   * @returns {Promise}
   */
  async use(usage = {}, { event, ...dialog } = {}, message = {}) {
    const activities = this.activities;
    if (!activities.size) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoActivities", { localize: true });
      return;
    }

    let activity;
    if ((activities.size === 1) || event?.shiftKey) activity = activities.contents[0];
    else {
      const configuration = await artichron.applications.apps.item.ActivitySelectDialog.create({ item: this.parent });
      if (!configuration) return null;
      activity = activities.get(configuration.activity);
      return activity.use(usage, { ...dialog, ...configuration }, message);
    }

    if (activity) return activity.use(usage, { ...dialog, event }, message);
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
          await actor.update({ [`system.equipped.arsenal.${k}`]: "" });
          return this.parent;
        }
      }
    } else if (this.parent.type === "armor") {
      const a = actor.armor;
      for (const [k, v] of Object.entries(a)) {
        if (v === this.parent) {
          await actor.update({ [`system.equipped.armor.${k}`]: "" });
          return this.parent;
        }
      }
    }
  }

  /* -------------------------------------------------- */

  /**
   * Equip this item.
   * @returns {Promise<boolean>}    Whether equipping was successful.
   */
  async equip() {
    if (!this.canEquip) return false;

    if (this.parent.isArsenal) {
      let primary;
      let secondary;

      if (this.isTwoHanded) {
        primary = this.parent.id;
        secondary = "";
      } else {
        const arsenal = this.parent.actor.arsenal;
        if (!arsenal.primary) {
          primary = this.parent.id;
          secondary = arsenal.secondary?.id ?? "";
        } else if (arsenal.primary.isOneHanded) {
          primary = arsenal.primary.id;
          secondary = this.parent.id;
        } else {
          primary = this.parent.id;
          secondary = "";
        }
      }

      await this.parent.actor.update({
        "system.equipped.arsenal.primary": primary,
        "system.equipped.arsenal.secondary": secondary,
      });

      return true;
    }

    else if (this.parent.isArmor) {
      const slot = this.category.subtype;
      await this.parent.actor.update({
        [`system.equipped.armor.${slot}`]: this.parent.id,
      });
      return true;
    }

    return false;
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve an object for roll data.
   * @returns {object}
   */
  getRollData() {
    return { ...this };
  }

  /* -------------------------------------------------- */
  /*   Tooltips                                         */
  /* -------------------------------------------------- */

  /**
   * Create data for an enriched tooltip.
   * @returns {Promise<HTMLElement>}
   */
  async richTooltip() {
    const template = "systems/artichron/templates/ui/item/tooltip.hbs";
    const context = await this._prepareTooltipContext();
    const div = document.createElement("DIV");
    div.innerHTML = await foundry.applications.handlebars.renderTemplate(template, context);
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
    const description = await foundry.applications.ux.TextEditor.enrichHTML(this.description.value, {
      rollData: rollData, relativeTo: item,
    });

    const context = {
      item: item,
      rollData: rollData,
      description: description,
      subtitle: game.i18n.localize(`TYPES.Item.${this.parent.type}`),
      tags: this._prepareTooltipTags(),
      properties: this._prepareTooltipProperties(),
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
      if (this.isOneHanded) tags.push({ label: "One-Handed" });
      else tags.push({ label: "Two-Handed" });
    }

    const valid = this.constructor._attributeChoices();
    for (const attribute of this.attributes.value) {
      const label = valid[attribute]?.label;
      if (label) tags.push({ label: label });
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

    props.push({ title: "Price", label: this.price.value ?? 0, icon: "fa-solid fa-sack-dollar" });
    props.push({ title: "Weight", label: this.weight.total, icon: "fa-solid fa-weight-hanging" });

    if (this.schema.has("quantity")) {
      props.push({ title: "Qty", label: this.quantity.value ?? 0, icon: "fa-solid fa-cubes-stacked" });
    }

    return props;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.ITEM",
  ];

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
   * Can this item be equipped on its owning actor?
   * @type {boolean}
   */
  get canEquip() {
    if (!this.parent.isEmbedded) return false;

    if (!this.parent.actor.system.schema.has("equipped")) return false;

    if (this.parent.isArmor || this.parent.isArsenal) {
      return !this.parent.isEquipped;
    }

    return false;
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
      "system.attributes.value",
    ]);
  }

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    this.weight.total = this.weight.value * (this.quantity?.value ?? 1);
    for (const k of Object.keys(this.attributes.levels)) {
      this.attributes.levels[k] ??= 1;
    }
  }
}
