import ArsenalData from "./item-arsenal.mjs";

const {NumberField, SchemaField, StringField} = foundry.data.fields;

export default class ShieldData extends ArsenalData {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    type: "shield",
    defaultWeight: 2
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      armor: new SchemaField({
        value: new NumberField({min: 0, integer: true})
      }),
      category: new SchemaField({
        subtype: new StringField({
          required: true,
          initial: "buckler",
          choices: CONFIG.SYSTEM.SHIELD_TYPES
        })
      }),
      cost: new SchemaField({
        value: new NumberField({min: 0, initial: 1, nullable: false})
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.armor.value"
    ]));
  }

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ItemProperty.ShieldProperty"
  ];

  /* -------------------------------------------------- */

  /** @override */
  async use() {
    if (!this.hasDamage) {
      ui.notifications.warn("ARTICHRON.Warning.ItemHasNoDamageRolls", {localize: true});
      return null;
    }

    const item = this.parent;
    const actor = item.actor;

    if (!item.isEquipped) {
      ui.notifications.warn("ARTICHRON.Warning.ItemIsNotEquipped", {localize: true});
      return null;
    }

    if (!this.canUsePips) {
      ui.notifications.warn("ARTICHRON.Warning.MissingActionPoints", {localize: true});
      return null;
    }

    if (actor.inCombat) {
      await actor.spendActionPoints(item.system.cost.value);
    }

    const flags = {artichron: {usage: {
      damage: {multiply: 0.5, ids: []},
      target: {
        allowPreTarget: true,
        count: 1,
        range: this.range.reach
      }
    }}};

    const messageData = {
      type: "usage",
      speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
      "system.item": item.uuid,
      flags: flags
    };

    return ChatMessage.implementation.create(messageData);
  }

  /* -------------------------------------------------- */

  /** @override */
  async richTooltip() {
    const template = "systems/artichron/templates/item/tooltip.hbs";

    const item = this.parent;
    const rollData = this.parent.getRollData();

    const context = {
      item: this.parent,
      enriched: await TextEditor.enrichHTML(this.description.value, {
        rollData: rollData, relativeTo: item
      }),
      subtitle: `${game.i18n.localize("TYPES.Item.shield")}, ${CONFIG.SYSTEM.SHIELD_TYPES[this.category.subtype].label}`,
      damages: this._damages.map(k => {
        return {
          formula: Roll.create(k.formula, rollData).formula,
          config: CONFIG.SYSTEM.DAMAGE_TYPES[k.type]
        };
      }),
      bonuses: Object.entries(this.damage.bonuses).reduce((acc, [type, {value}]) => {
        if (value) acc.push({
          value: value,
          config: CONFIG.SYSTEM.DAMAGE_TYPES[type]
        });
        return acc;
      }, []),
      tags: this.#tooltipTags(),
      properties: this.#tooltipProps()
    };

    const div = document.createElement("DIV");
    div.innerHTML = await renderTemplate(template, context);
    div.classList.add("shield");

    return div;
  }

  #tooltipTags() {
    const tags = [];

    if (this.parent.isMelee) tags.push({label: "Melee"});
    else tags.push({label: "Ranged"});

    if (this.wield.value === 1) tags.push({label: "One-Handed"});
    else tags.push({label: "Two-Handed"});

    for (const attribute of this.attributes.value) {
      const label = CONFIG.SYSTEM.ITEM_ATTRIBUTES[attribute]?.label;
      if (label) tags.push({label: label});
    }

    return tags;
  }

  #tooltipProps() {
    const props = [];

    props.push({title: "Price", label: this.price.value ?? 0, icon: "fa-solid fa-sack-dollar"});
    props.push({title: "Weight", label: this.weight.total, icon: "fa-solid fa-weight-hanging"});

    if (this.parent.isMelee) props.push({title: "Reach", label: `${this.range.reach}m`, icon: "fa-solid fa-bullseye"});
    else props.push({title: "Range", label: `${this.range.value}m`, icon: "fa-solid fa-bullseye"});

    props.push({title: "Armor", label: this.armor.value ?? 0, icon: "fa-solid fa-shield"});

    return props;
  }
}
