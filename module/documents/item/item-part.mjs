import ItemSystemModel from "./system-model.mjs";

const {SchemaField, StringField, NumberField} = foundry.data.fields;

export default class PartData extends ItemSystemModel {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    inventorySection: "loot",
    type: "part",
    defaultWeight: 1
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new SchemaField({
        value: new NumberField({initial: 1, min: 0, integer: true, nullable: true})
      }),
      category: new SchemaField({
        subtype: new StringField({
          required: true,
          initial: () => Object.keys(CONFIG.SYSTEM.PART_TYPES)[0],
          choices: CONFIG.SYSTEM.PART_TYPES
        })
      })
    };
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
      subtitle: `${game.i18n.localize("TYPES.Item.part")}, ${CONFIG.SYSTEM.PART_TYPES[this.category.subtype].label}`,
      tags: this.#tooltipTags(),
      properties: this.#tooltipProps()
    };

    const div = document.createElement("DIV");
    div.innerHTML = await renderTemplate(template, context);
    div.classList.add("part");

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
    props.push({title: "Quantity", label: this.quantity.value ?? 0, icon: "fa-solid fa-cubes-stacked"});

    return props;
  }
}
