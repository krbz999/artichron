import BaseActivity from "./base-activity.mjs";

const { EmbeddedDataField } = foundry.data.fields;

export default class DefendActivity extends BaseActivity {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      defend: new EmbeddedDataField(artichron.data.FormulaModel),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "defend";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ACTIVITY.DEFEND",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async use(usage, dialog, message) {
    const attr = this.item.system.attributes.value;
    if (!attr.has("blocking") && !attr.has("parrying")) {
      throw new Error("This item cannot be used to defend.");
    }

    const configuration = await this.configure(usage, dialog, message);
    if (!configuration) return null;

    const actor = this.item.actor;
    const item = this.item;
    const rollData = this.getRollData();

    const roll = foundry.dice.Roll.create(this.defend.formula, rollData);
    if (configuration.usage.defend?.increase) roll.alter(1, configuration.usage.defend.increase);
    if (!attr.has("blocking")) roll.alter(0.5);

    const consumed = await this.consume(configuration.usage);
    if (!consumed) return null;

    await item.setFlag("artichron", `usage.${this.id}`, {
      "rollMode.mode": foundry.utils.getProperty(configuration.usage, "rollMode.mode") ?? true,
    });

    await roll.evaluate();

    const Cls = foundry.utils.getDocumentClass("ChatMessage");
    const messageData = {
      type: "usage",
      rolls: [roll],
      speaker: Cls.getSpeaker({ actor: actor }),
      "system.activity": this.id,
      "system.item": item.uuid,
      "flags.artichron.usage": configuration.usage,
      "flags.artichron.type": DefendActivity.TYPE,
    };
    Cls.applyRollMode(messageData, configuration.usage.rollMode.mode);
    foundry.utils.mergeObject(messageData, configuration.message);
    return Cls.create(messageData);
  }
}
