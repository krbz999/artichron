import BaseActivity from "./base-activity.mjs";
import ChatMessageArtichron from "../chat-message.mjs";
import FormulaModel from "../data/formula-model.mjs";

const { EmbeddedDataField, NumberField, SchemaField, StringField } = foundry.data.fields;

const targetField = () => {
  return new SchemaField({
    type: new StringField({
      choices: CONFIG.SYSTEM.TARGET_TYPES,
      initial: "single",
      required: true,
    }),
    count: new NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
    duration: new StringField({
      choices: CONFIG.SYSTEM.TEMPLATE_DURATIONS,
      initial: "combat",
      required: true,
    }),
    range: new NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
    size: new NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
    width: new NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
  });
};

export default class HealingActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultName: "ARTICHRON.ACTIVITY.Types.HealingDefaultName",
    label: "ARTICHRON.ACTIVITY.Types.Healing",
  }, { inplace: false }));

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      healing: new EmbeddedDataField(FormulaModel),
      target: targetField(),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "healing";
  }

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

    const messageData = {
      type: "usage",
      rolls: [roll],
      speaker: ChatMessageArtichron.getSpeaker({ actor: actor }),
      "system.activity": this.id,
      "system.item": item.uuid,
      "system.targets": Array.from(game.user.targets.map(t => t.actor?.uuid)),
      "flags.artichron.usage": configuration.usage,
      "flags.artichron.type": HealingActivity.metadata.type,
    };
    ChatMessageArtichron.applyRollMode(messageData, configuration.usage.rollMode.mode);
    foundry.utils.mergeObject(messageData, configuration.message);
    return ChatMessageArtichron.create(messageData);
  }
}
