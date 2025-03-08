import BaseActivity from "./base-activity.mjs";
import ChatMessageArtichron from "../chat-message.mjs";

const { NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

const targetField = () => {
  return new SchemaField({
    type: new StringField({
      choices: artichron.config.TARGET_TYPES,
      initial: "single",
      required: true,
    }),
    count: new NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
    duration: new StringField({
      choices: artichron.config.TEMPLATE_DURATIONS,
      initial: "combat",
      required: true,
    }),
    range: new NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
    size: new NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
    width: new NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
  });
};

export default class EffectActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultName: "ARTICHRON.ACTIVITY.Types.EffectDefaultName",
    label: "ARTICHRON.ACTIVITY.Types.Effect",
    type: "effect",
  }, { inplace: false }));

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      effects: new SchemaField({
        ids: new SetField(new StringField()),
      }),
      target: targetField(),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "effect";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async use(usage = {}, dialog = {}, message = {}) {
    if (!this.effects.ids.size) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoEffects", { localize: true });
      return null;
    }

    const configuration = await this.configure(usage, dialog, message);
    if (!configuration) return null;

    const actor = this.item.actor;
    const item = this.item;

    const consumed = await this.consume(configuration.usage);
    if (!consumed) return null;

    await item.setFlag("artichron", `usage.${this.id}`, {
      "template.place": foundry.utils.getProperty(configuration.usage, "template.place") ?? true,
    });

    // Place templates.
    if (configuration.usage.template?.place) await this.placeTemplate({ increase: configuration.usage.template.increase });

    const messageData = {
      type: "usage",
      speaker: ChatMessageArtichron.getSpeaker({ actor: actor }),
      "system.activity": this.id,
      "system.item": item.uuid,
      "system.targets": Array.from(game.user.targets.map(t => t.actor?.uuid)),
      "flags.artichron.usage": configuration.usage,
      "flags.artichron.type": EffectActivity.metadata.type,
    };
    ChatMessageArtichron.applyRollMode(messageData, configuration.usage.rollMode.mode);
    foundry.utils.mergeObject(messageData, configuration.message);
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
