import BaseActivity from "./base-activity.mjs";

const { EmbeddedDataField } = foundry.data.fields;

export default class HealingActivity extends BaseActivity {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      healing: new EmbeddedDataField(artichron.data.FormulaModel),
      target: new artichron.data.fields.ActivityTargetField(),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "healing";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ACTIVITY.HEALING",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async use() {
    const actor = this.item.actor;
    const rollData = this.getRollData();

    const roll = foundry.dice.Roll.create(this.healing.formula, rollData);
    await roll.evaluate();

    // Place templates.
    if (this.hasTemplate) await this.placeTemplate();

    const Cls = foundry.utils.getDocumentClass("ChatMessage");
    const messageData = {
      type: "healing",
      rolls: [roll],
      speaker: Cls.getSpeaker({ actor }),
      "system.activity": this.uuid,
    };
    Cls.applyRollMode(messageData, game.settings.get("core", "rollMode"));
    return Cls.create(messageData);
  }
}
