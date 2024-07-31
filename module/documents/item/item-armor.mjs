import {ResistanceField} from "../fields/resistance-field.mjs";
import ItemSystemModel from "./system-model.mjs";
import {FusionTemplateMixin} from "./templates/fusion-data.mjs";

const {NumberField, SchemaField, StringField} = foundry.data.fields;

export default class ArmorData extends FusionTemplateMixin(ItemSystemModel) {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    inventorySection: "gear",
    type: "armor",
    defaultWeight: 2
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      resistances: new ResistanceField(),
      armor: new SchemaField({
        value: new NumberField({min: 0, integer: true})
      }),
      category: new SchemaField({
        subtype: new StringField({
          required: true,
          initial: () => Object.keys(CONFIG.SYSTEM.EQUIPMENT_TYPES)[0],
          choices: CONFIG.SYSTEM.EQUIPMENT_TYPES
        })
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.armor.value",
      ...Object.entries(CONFIG.SYSTEM.DAMAGE_TYPES).reduce((acc, [k, v]) => {
        if (v.resist) acc.push(`system.resistances.${k}.value`);
        return acc;
      }, [])
    ]));
  }

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ItemProperty.ArmorProperty"
  ];

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
      subtitle: `${game.i18n.localize("TYPES.Item.armor")}, ${CONFIG.SYSTEM.EQUIPMENT_TYPES[this.category.subtype].label}`,
      resistances: Object.entries(this.resistances).reduce((acc, [type, {value}]) => {
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
    div.classList.add("armor");

    return div;
  }

  #tooltipTags() {
    const tags = [];

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
    props.push({title: "Armor", label: this.armor.value ?? 0, icon: "fa-solid fa-shield"});

    return props;
  }
}
