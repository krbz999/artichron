import ItemSystemModel from "./system-model.mjs";

const { NumberField, SchemaField, StringField } = foundry.data.fields;

export default class ArmorData extends ItemSystemModel {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      embedded: {
        ArmorRequirement: "system.category.requirements",
      },
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      category: new SchemaField({
        value: new StringField({
          required: true,
          blank: true,
          choices: () => ({
            "": game.i18n.localize("ARTICHRON.EQUIPMENT.CATEGORY.None"),
            ...artichron.config.EQUIPMENT_CATEGORIES,
          }),
        }),
        subtype: new StringField({
          required: true,
          initial: () => Object.keys(artichron.config.EQUIPMENT_TYPES)[0],
          choices: artichron.config.EQUIPMENT_TYPES,
        }),
        requirements: new artichron.data.fields.CollectionField(
          artichron.data.pseudoDocuments.armorRequirements.BaseArmorRequirement,
        ),
      }),

      defenses: new SchemaField(artichron.config.DAMAGE_TYPES.optgroups.reduce((acc, { value: k }) => {
        acc[k] = new SchemaField({ value: new NumberField({ integer: true, initial: 0, nullable: false }) });
        return acc;
      }, {})),

      fusion: new artichron.data.fields.FusionField(),

      price: new SchemaField({
        value: new NumberField({ min: 0, initial: 0, integer: true, nullable: false }),
      }),
      weight: new SchemaField({
        value: new NumberField({ min: 0, step: 0.01, initial: 2, nullable: false }),
      }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ITEM.ARMOR",
  ];

  /* -------------------------------------------------- */

  /**
   * Does the owner of this item fulfill all the requirements to gain its benefits?
   * @type {boolean}
   */
  get fulfilledRequirements() {
    for (const r of this.category.requirements) {
      if (!r.fulfilledRequirements) return false;
    }
    return true;
  }

  /* -------------------------------------------------- */
  /*   Tooltips                                         */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareTooltipContext() {
    const context = await super._prepareTooltipContext();

    context.requirements = this.category.requirements.map(r => {
      return { content: r.toRequirement(), fulfilled: r.fulfilledRequirements };
    });

    context.defenses = Object.entries(this.defenses).reduce((acc, [type, { value }]) => {
      if (value) acc.push({
        value: value,
        config: artichron.config.DAMAGE_TYPES[type],
      });
      return acc;
    }, []);

    return context;
  }
}
