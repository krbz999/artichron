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
  async use(usage = {}, dialog = {}, message = {}) {
    const configuration = await this.configure(usage, dialog, message);
    if (!configuration) return null;

    const actor = this.item.actor;
    const item = this.item;
    const rollData = this.getRollData();

    const roll = foundry.dice.Roll.create(this.healing.formula, rollData);
    if (configuration.usage.healing?.increase) roll.alter(1, configuration.usage.healing.increase);
    await roll.evaluate();

    const consumed = await this.consume(configuration.usage);
    if (!consumed) return null;

    await item.setFlag("artichron", `usage.${this.id}`, {
      "template.place": foundry.utils.getProperty(configuration.usage, "template.place") ?? true,
      "rollMode.mode": foundry.utils.getProperty(configuration.usage, "rollMode.mode"),
    });

    // Place templates.
    if (configuration.usage.template?.place) await this.placeTemplate({ increase: configuration.usage.template.increase });

    const Cls = foundry.utils.getDocumentClass("ChatMessage");
    const messageData = {
      type: "healing",
      rolls: [roll],
      speaker: Cls.getSpeaker({ actor: actor }),
      "system.activity": this.uuid,
    };
    Cls.applyRollMode(messageData, configuration.usage.rollMode.mode);
    foundry.utils.mergeObject(messageData, configuration.message);
    return Cls.create(messageData);
  }
}
