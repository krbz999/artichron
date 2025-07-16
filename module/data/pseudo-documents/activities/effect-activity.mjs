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
  async use() {
    if (!this.effects.ids.size && foundry.utils.isEmpty(this.effects.statuses)) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoEffects", { localize: true });
      return null;
    }

    const actor = this.item.actor;

    // Place templates.
    if (this.hasTemplate) await this.placeTemplate();

    const Cls = foundry.utils.getDocumentClass("ChatMessage");
    const messageData = {
      type: "effect",
      speaker: Cls.getSpeaker({ actor }),
      "system.activity": this.uuid,
    };
    Cls.applyRollMode(messageData, game.settings.get("core", "rollMode"));
    return Cls.create(messageData);
  }
}
