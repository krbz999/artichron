import BaseActivity from "./base-activity.mjs";

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
  static metadata = Object.freeze({
    type: "effect",
    label: "ARTICHRON.ACTIVITY.Types.Effect"
  });

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

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  get chatButtons() {
    const buttons = super.chatButtons;
    buttons.unshift({
      action: "effect",
      label: game.i18n.localize("ARTICHRON.ACTIVITY.Buttons.Effect")
    });
    return buttons;
  }
}
