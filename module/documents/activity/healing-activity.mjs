import BaseActivity from "./base-activity.mjs";
import ChatMessageArtichron from "../chat-message.mjs";

const {NumberField, SchemaField, StringField} = foundry.data.fields;

const targetField = () => {
  return new SchemaField({
    type: new StringField({
      choices: CONFIG.SYSTEM.TARGET_TYPES,
      initial: "single",
      required: true
    }),
    count: new NumberField({min: 1, integer: true, nullable: false, initial: 1}),
    duration: new StringField({
      choices: CONFIG.SYSTEM.TEMPLATE_DURATIONS,
      initial: "combat",
      required: true
    }),
    range: new NumberField({min: 1, integer: true, nullable: false, initial: 1}),
    size: new NumberField({min: 1, integer: true, nullable: false, initial: 1}),
    width: new NumberField({min: 1, integer: true, nullable: false, initial: 1})
  });
};

export default class HealingActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze({
    type: "healing",
    label: "ARTICHRON.ACTIVITY.Types.Healing"
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      healing: new SchemaField({
        formula: new StringField({required: true})
      }),
      target: targetField()
    });
  }

  /* -------------------------------------------------- */

  /**
   * Perform a healing roll.
   * @param {object} [config]               Roll config.
   * @param {number} [config.multiply]      A multiplier on the number of dice rolled.
   * @param {number} [config.addition]      An addition to the number of dice rolled.
   * @param {object} [options]              Chat message options.
   * @param {boolean} [options.create]      If false, returns the rolls instead of a chat message.
   * @returns {Promise<ChatMessageArtichron|RollArtichron[]|null>}
   */
  async rollHealing({multiply, addition} = {}, {create = true} = {}) {
    if (!this.healing.formula || !foundry.dice.Roll.validate(this.healing.formula)) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.WARNING.NoHealing", {localize: true});
      return null;
    }

    const rollData = this.item.getRollData();
    const roll = foundry.dice.Roll.create(this.healing.formula, rollData);
    roll.alter(multiply ?? 1, addition ?? 0);
    await roll.evaluate();

    if (create) {
      const rollMode = game.settings.get("core", "rollMode");
      const messageData = {
        type: "healing",
        rolls: [roll],
        speaker: ChatMessageArtichron.getSpeaker({actor: this.item.actor}),
        flavor: game.i18n.format("ARTICHRON.ROLL.Healing.Flavor", {name: this.item.name}),
        "system.activity": this.id,
        "system.item": this.item.uuid,
        "system.targets": Array.from(game.user.targets.map(t => t.actor?.uuid))
      };
      ChatMessageArtichron.applyRollMode(messageData, rollMode);
      return ChatMessageArtichron.create(messageData);
    } else {
      return [roll];
    }
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  get chatButtons() {
    const buttons = super.chatButtons;
    buttons.unshift({
      action: "healing",
      label: game.i18n.localize("ARTICHRON.ACTIVITY.Buttons.Healing")
    });
    return buttons;
  }
}
