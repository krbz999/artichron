import ActivityUseDialog from "../../applications/item/activity-use-dialog.mjs";
import BaseActivity from "./base-activity.mjs";
import ChatMessageArtichron from "../chat-message.mjs";

const {SchemaField, StringField} = foundry.data.fields;

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
      defend: new SchemaField({
        formula: new StringField({required: true})
      })
    });
  }

  /* -------------------------------------------------- */

  /**
   * Perform a defensive roll.
   * @returns {Promise<ChatMessageArtichron|null>}
   */
  async use() {
    if (!this.defend.formula) {
      ui.notifications.error("ARTICHRON.ACTIVITY.Warning.NoDefense", {localize: true});
      return;
    }

    const attr = this.item.system.attributes.value;
    if (!attr.has("blocking") && !attr.has("parrying")) {
      throw new Error("This item cannot be used to defend.");
    }

    const configuration = await ActivityUseDialog.create(this);
    if (!configuration) return null;

    const config = foundry.utils.mergeObject({
      defend: 0,
      elixirs: [],
      rollMode: game.settings.get("core", "rollMode")
    }, configuration);

    const actor = this.item.actor;
    const item = this.item;
    const rollData = item.getRollData();

    const roll = foundry.dice.Roll.create(this.defend.formula, rollData);
    if (config.defend) roll.alter(1, config.defend);
    if (!attr.has("blocking")) roll.alter(0.5);

    const consumed = await this.consume({
      pool: config.defend,
      elixirs: config.elixirs
    });
    if (!consumed) return null;

    await roll.evaluate();

    const messageData = {
      type: "usage",
      rolls: [roll],
      speaker: ChatMessageArtichron.getSpeaker({actor: actor}),
      "system.activity": this.id,
      "system.item": item.uuid,
      "flags.artichron.usage": config,
      "flags.artichron.type": DefendActivity.metadata.type
    };
    ChatMessageArtichron.applyRollMode(messageData, config.rollMode);
    return ChatMessageArtichron.create(messageData);
  }
}
