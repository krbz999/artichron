import ItemSystemModel from "./system-model.mjs";

const {
  BooleanField, NumberField, SchemaField, StringField,
} = foundry.data.fields;

export default class SpellData extends ItemSystemModel {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      embedded: {
        Activity: "system.activities",
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
      activities: new artichron.data.fields.CollectionField(artichron.data.pseudoDocuments.activities.BaseActivity),
      spell: new SchemaField({
        quality: new NumberField({ integer: true, min: 1, max: 5, nullable: false, initial: 1 }),
        origin: new StringField({ required: true, choices: () => artichron.config.SPELL_ORIGINS, initial: "elemental" }),
      }),
      price: new SchemaField({
        value: new NumberField({ min: 0, initial: 0, integer: true, nullable: false }),
      }),
      weight: new SchemaField({
        value: new NumberField({ min: 0, step: 0.01, initial: 1, nullable: false }),
      }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ITEM.SPELL",
  ];

  /* -------------------------------------------------- */
  /*   Fusion                                           */
  /* -------------------------------------------------- */

  /**
   * Fuse onto a target armor item.
   * @param {foundry.documents.Item} armor    The armor item.
   * @returns {Promise<foundry.documents.ActiveEffect>}
   */
  async fuse(armor) {
    const spell = this.parent;

    const effect = await foundry.utils.getDocumentClass("ActiveEffect").create({
      type: "fusion",
      name: game.i18n.format("ARTICHRON.FUSION.defaultName", { name: spell.name }),
      img: spell.img,
      changes: SpellData.createFusionData(spell, armor),
      system: {
        itemData: game.items.fromCompendium(spell, { clearFolder: true, keepId: true }),
      },
    }, { parent: armor });

    await spell.delete();
    return effect;
  }

  /* -------------------------------------------------- */

  /**
   * Create a dialog for choosing the target armor item that should be fused onto.
   * @returns {Promise<foundry.documents.ActiveEffect|null>}
   */
  async fuseDialog() {
    const spell = this.parent;
    const actor = spell.actor;
    if (!spell.isEmbedded) {
      throw new Error("An unowned item cannot be fused.");
    }

    const configuration = await artichron.applications.apps.item.ItemFusionDialog.create({
      item: spell,
    });
    if (!configuration) return null;

    const armor = actor.items.get(configuration.itemId);
    return spell.system.fuse(armor);
  }

  /* -------------------------------------------------- */

  /**
   * Create the `changes` of a fusion effect.
   * @param {foundry.documents.Item} spell    The spell item.
   * @param {foundry.documents.Item} armor    The armor item.
   * @returns {object[]}
   */
  static createFusionData(spell, armor) {
    const changes = [];

    // The armor is more expensive (equal to half the spell's value).
    changes.push({
      key: "system.price.value",
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: String(Math.floor(spell.system.price.value / 2)),
    });

    const quality = spell.system.spell.quality;
    // Additional benefit depending on spell origin.
    switch (spell.system.spell.origin) {
      case "elemental": {
        for (const [k, v] of Object.entries(artichron.config.DAMAGE_TYPES)) {
          if (v.group !== "elemental") continue;
          changes.push({
            key: `system.defenses.${k}`,
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: String(quality),
          });
        }
        break;
      }
      case "planar":
        changes.push({
          key: "system.defenses.physical",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: String(2 * quality),
        });
        break;
      case "technological": {
        for (const k in artichron.config.SKILLS) {
          changes.push({
            key: `system.skills.${k}`,
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: String(quality),
          });
        }
        break;
      }
    }

    // TODO: other random change

    return changes;
  }
}
