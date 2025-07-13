import BaseActivity from "./base-activity.mjs";

const { NumberField, SchemaField, SetField, StringField, TypedObjectField } = foundry.data.fields;

export default class EffectActivity extends BaseActivity {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      effects: new SchemaField({
        ids: new SetField(new StringField()),
        statuses: new TypedObjectField(new SchemaField({
          rounds: new NumberField({ integer: true, initial: 2, nullable: false, min: 1 }),
          levels: new NumberField({ integer: true, initial: 1, nullable: false, min: 1 }),
        }), { validateKey: key => key in artichron.config.STATUS_CONDITIONS }),
      }),
      target: new artichron.data.fields.ActivityTargetField(),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "effect";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ACTIVITY.EFFECT",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async use(usage = {}, dialog = {}, message = {}) {
    if (!this.effects.ids.size && foundry.utils.isEmpty(this.effects.statuses)) {
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

    const Cls = foundry.utils.getDocumentClass("ChatMessage");
    const messageData = {
      type: "effect",
      speaker: Cls.getSpeaker({ actor: actor }),
      "system.activity": this.uuid,
    };
    Cls.applyRollMode(messageData, configuration.usage.rollMode.mode);
    foundry.utils.mergeObject(messageData, configuration.message);
    return Cls.create(messageData);
  }
}
