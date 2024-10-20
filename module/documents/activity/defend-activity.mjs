import BaseActivity from "./base-activity.mjs";
import ChatMessageArtichron from "../chat-message.mjs";
import FormulaModel from "../fields/formula-model.mjs";

const {EmbeddedDataField} = foundry.data.fields;

export default class DefendActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    type: "defend",
    label: "ARTICHRON.ACTIVITY.Types.Defend"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      defend: new EmbeddedDataField(FormulaModel)
    });
  }

  /* -------------------------------------------------- */

  /**
   * Perform a defensive roll.
   * @returns {Promise<ChatMessageArtichron|null>}
   */
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
      "rollMode.mode": foundry.utils.getProperty(configuration.usage, "rollMode.mode") ?? true
    });

    await roll.evaluate();

    const messageData = {
      type: "usage",
      rolls: [roll],
      speaker: ChatMessageArtichron.getSpeaker({actor: actor}),
      "system.activity": this.id,
      "system.item": item.uuid,
      "flags.artichron.usage": configuration.usage,
      "flags.artichron.type": DefendActivity.metadata.type
    };
    ChatMessageArtichron.applyRollMode(messageData, configuration.usage.rollMode.mode);
    foundry.utils.mergeObject(messageData, configuration.message);
    return ChatMessageArtichron.create(messageData);
  }
}
