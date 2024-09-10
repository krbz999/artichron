import ActivityUseDialog from "../../applications/item/activity-use-dialog.mjs";
import BaseActivity from "./base-activity.mjs";
import ChatMessageArtichron from "../chat-message.mjs";

const {NumberField, SchemaField, SetField, StringField} = foundry.data.fields;

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

export default class EffectActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    type: "effect",
    label: "ARTICHRON.ACTIVITY.Types.Effect"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      effects: new SchemaField({
        ids: new SetField(new StringField())
      }),
      target: targetField()
    });
  }

  /* -------------------------------------------------- */

  /** @override */
  async use() {
    if (!this.effects.ids.size) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoEffects", {localize: true});
      return null;
    }

    const configuration = await ActivityUseDialog.create(this);
    if (!configuration) return null;

    const actor = this.item.actor;
    const item = this.item;

    const config = foundry.utils.mergeObject({
      area: 0,
      elixirs: [],
      rollMode: game.settings.get("core", "rollMode")
    }, configuration);

    const consumed = await this.consume({
      pool: config.area,
      elixirs: config.elixirs
    });
    if (!consumed) return null;

    // Place templates.
    if (this.hasTemplate) await this.placeTemplate({increase: config.area});

    const messageData = {
      type: "usage",
      speaker: ChatMessageArtichron.getSpeaker({actor: actor}),
      "system.activity": this.id,
      "system.item": item.uuid,
      "system.targets": Array.from(game.user.targets.map(t => t.actor?.uuid)),
      "flags.artichron.usage": config,
      "flags.artichron.type": EffectActivity.metadata.type
    };
    ChatMessageArtichron.applyRollMode(messageData, config.rollMode);
    return ChatMessageArtichron.create(messageData);
  }

  /* -------------------------------------------------- */

  /**
   * Transfer a copy of the effects to actors.
   * @param {ActorArtichron[]} [targets]      The actor targets.
   * @returns {Promise<void>}                 A promise that resolves once all socket events have been emitted.
   */
  async grantEffects(targets = []) {
    const effects = this.effects.ids.map(id => this.item.effects.get(id));
    for (const actor of targets) {
      for (const effect of effects) {
        if (effect) artichron.utils.sockets.grantBuff(effect, actor);
      }
    }
  }
}
