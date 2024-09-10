import BaseActivity from "./base-activity.mjs";
import ChatMessageArtichron from "../chat-message.mjs";
import ActivityUseDialog from "../../applications/item/activity-use-dialog.mjs";

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
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    type: "healing",
    label: "ARTICHRON.ACTIVITY.Types.Healing"
  }, {inplace: false}));

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

  /** @override */
  async use({multiply, addition} = {}, {create = true} = {}) {
    if (!this.healing.formula || !foundry.dice.Roll.validate(this.healing.formula)) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.WARNING.NoHealing", {localize: true});
      return null;
    }

    const configuration = await ActivityUseDialog.create(this);
    if (!configuration) return null;

    const config = foundry.utils.mergeObject({
      area: 0,
      elixirs: [],
      healing: 0,
      rollMode: game.settings.get("core", "rollMode")
    }, configuration);

    const actor = this.item.actor;
    const item = this.item;
    const rollData = item.getRollData();

    const roll = foundry.dice.Roll.create(this.healing.formula, rollData);
    if (config.healing) roll.alter(1, config.healing);
    await roll.evaluate();

    const consumed = await this.consume({
      pool: config.area + config.healing,
      elixirs: config.elixirs
    });
    if (!consumed) return null;

    // Place templates.
    if (this.hasTemplate) await this.placeTemplate({increase: config.area});

    const messageData = {
      type: "usage",
      rolls: [roll],
      speaker: ChatMessageArtichron.getSpeaker({actor: actor}),
      "system.activity": this.id,
      "system.item": item.uuid,
      "system.targets": Array.from(game.user.targets.map(t => t.actor?.uuid)),
      "flags.artichron.usage": config,
      "flags.artichron.type": "healing"
    };
    ChatMessageArtichron.applyRollMode(messageData, config.rollMode);
    return ChatMessageArtichron.create(messageData);
  }
}
