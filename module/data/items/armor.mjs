import ItemSystemModel from "./system-model.mjs";

const { NumberField, SchemaField, StringField } = foundry.data.fields;

export default class ArmorData extends ItemSystemModel {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      embedded: {
        ArmorRequirement: "system.armor.requirements",
      },
      sections: {
        inventory: true,
      },
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      armor: new SchemaField({
        category: new StringField({
          required: true,
          blank: false,
          initial: "tech",
          choices: () => artichron.config.EQUIPMENT_CATEGORIES,
        }),
        slot: new StringField({
          required: true,
          blank: false,
          initial: "chest",
          choices: artichron.config.EQUIPMENT_TYPES,
        }),
        requirements: new artichron.data.fields.CollectionField(
          artichron.data.pseudoDocuments.armorRequirements.BaseArmorRequirement,
        ),
      }),

      defenses: new SchemaField(artichron.config.DAMAGE_TYPES.optgroups
        .reduce((acc, { value }) => Object.assign(acc, { [value]: new NumberField({ integer: true }) }), {}),
      ),

      skills: new SchemaField({
        agility: new NumberField({ integer: true, min: 0, initial: null }),
        brawn: new NumberField({ integer: true, min: 0, initial: null }),
        mind: new NumberField({ integer: true, min: 0, initial: null }),
        spirit: new NumberField({ integer: true, min: 0, initial: null }),
      }),

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
    for (const r of this.armor.requirements) {
      if (!r.fulfilledRequirements) return false;
    }
    return true;
  }

  /* -------------------------------------------------- */

  /**
   * Is this item currently equipped?
   * @type {boolean}
   */
  get isEquipped() {
    if (!this.parent.isEmbedded) return false;
    return this.parent.actor.system.equipment?.[this.armor.slot] === this.parent;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareBaseData() {
    super.prepareBaseData();

    const isPristine = this.attributes.value.has("pristine");
    const score = artichron.config.EQUIPMENT_TYPES[this.armor.slot].armorScore;
    const cat = this.armor.category;

    for (const k in artichron.config.DAMAGE_TYPES) {
      let multiplier;
      switch (artichron.config.DAMAGE_TYPES[k].group) {
        case "physical":
          multiplier = Number(cat === "natural") * (Number(isPristine) + 1);
          break;
        case "elemental":
          multiplier = Number(cat === "clothing") * (Number(isPristine) + 1);
          break;
      }

      if (multiplier) this.defenses[k] = this._source.defenses[k] + score * multiplier;
    }

    if (cat === "tech") {
      for (const k in artichron.config.SKILLS) this.skills[k] = this._source.skills[k] + (5 - score) + Number(isPristine);
    }
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Equip this item.
   * @returns {Promise<boolean>}
   */
  async equip() {
    if (this.isEquipped || !this.parent.actor?.system?.equipped) return false;
    await this.parent.actor.update({ [`system.equipped.${this.armor.slot}`]: this.parent.id });
    return true;
  }

  /* -------------------------------------------------- */

  /**
   * Unequip this item.
   * @returns {Promise<boolean>}
   */
  async unequip() {
    if (!this.isEquipped) return false;
    const actor = this.parent.actor;
    await actor.update({ [`system.equipped.${this.armor.slot}`]: "" });
    return true;
  }

  /* -------------------------------------------------- */
  /*   Tooltips                                         */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareTooltipContext() {
    const context = await super._prepareTooltipContext();

    context.requirements = this.parent.getEmbeddedPseudoDocumentCollection("ArmorRequirement").map(requirement => {
      return {
        content: requirement.toRequirement(),
        unfulfilled: !requirement.fulfilledRequirements,
      };
    });

    context.defenses = Object.entries(this.defenses).reduce((acc, [type, value]) => {
      if (value) acc.push({
        value,
        config: artichron.config.DAMAGE_TYPES[type],
      });
      return acc;
    }, []);

    return context;
  }
}
