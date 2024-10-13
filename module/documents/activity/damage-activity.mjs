import BaseActivity from "./base-activity.mjs";
import ChatMessageArtichron from "../chat-message.mjs";
import DamageFormulaModel from "../fields/damage-formula-model.mjs";

const {ArrayField, EmbeddedDataField, NumberField, SchemaField, StringField} = foundry.data.fields;

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

export default class DamageActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    type: "damage",
    label: "ARTICHRON.ACTIVITY.Types.Damage"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      damage: new ArrayField(new EmbeddedDataField(DamageFormulaModel)),
      target: targetField()
    });
  }

  /* -------------------------------------------------- */

  /** @override */
  async use(usage = {}, dialog = {}, message = {}) {
    if (!this.hasDamage) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoDamage", {localize: true});
      return null;
    }

    const configuration = await this.configure(usage, dialog, message);
    if (!configuration) return null;

    const actor = this.item.actor;
    const item = this.item;
    const ammo = item.actor.items.get(configuration.usage.damage?.ammoId) ?? null;

    const rollData = item.getRollData();
    if (ammo) rollData.ammo = ammo.getRollData().item;

    const parts = foundry.utils.deepClone(this._damages);
    const mods = ammo ? ammo.system.ammoProperties : new Set();

    // Override the damage type.
    if (mods.has("override")) {
      const override = ammo.system.override;
      for (const p of parts) {
        if ((override.group === "all") || (CONFIG.SYSTEM.DAMAGE_TYPES[p.type].group === override.group)) {
          p.type = override.value;
        }
      }
    }

    const rolls = Object.entries(parts.reduce((acc, d) => {
      acc[d.type] ??= [];
      acc[d.type].push(d.formula);
      return acc;
    }, {})).map(([type, formulas]) => {
      const roll = new CONFIG.Dice.DamageRoll(formulas.join("+"), rollData, {type: type});
      roll.alter(1, configuration.usage.damage?.increase ?? 0);
      return roll;
    });

    for (const roll of rolls) await roll.evaluate();

    // Add any amplifying bonuses (increasing the amount of damage dealt of a given type).
    for (const roll of rolls) {
      const group = CONFIG.SYSTEM.DAMAGE_TYPES[roll.type].group;
      const bonus = actor.system.bonuses.damage[group];
      if (!bonus) continue;
      const terms = [
        new foundry.dice.terms.OperatorTerm({operator: "+"}),
        new foundry.dice.terms.NumericTerm({number: Math.ceil(roll.total * bonus / 100)})
      ];
      for (const term of terms) {
        term._evaluated = true;
        roll.terms.push(term);
      }
      roll.resetFormula();
      roll._total = roll._evaluateTotal();
    }

    const consumed = await this.consume(configuration.usage);
    if (!consumed) return null;

    await item.setFlag("artichron", `usage.${this.id}`, {
      "damage.ammoId": foundry.utils.getProperty(configuration.usage, "damage.ammoId") ?? null,
      "rollMode.mode": foundry.utils.getProperty(configuration.usage, "rollMode.mode"),
      "template.place": foundry.utils.getProperty(configuration.usage, "template.place") ?? true
    });

    // Place templates.
    if (configuration.usage.template?.place) await this.placeTemplate({increase: configuration.usage.template.increase});

    const messageData = {
      type: "usage",
      rolls: rolls,
      speaker: ChatMessageArtichron.getSpeaker({actor: actor}),
      "system.activity": this.id,
      "system.item": item.uuid,
      "system.targets": Array.from(game.user.targets.map(t => t.actor?.uuid)),
      "flags.artichron.usage": configuration.usage,
      "flags.artichron.type": DamageActivity.metadata.type
    };
    ChatMessageArtichron.applyRollMode(messageData, configuration.usage.rollMode.mode);
    foundry.utils.mergeObject(messageData, configuration.message);
    return ChatMessageArtichron.create(messageData);
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  get hasDamage() {
    return this.damage.length > 0;
  }

  /* -------------------------------------------------- */

  /**
   * Valid damage parts.
   * @type {object[]}
   */
  get _damages() {
    return this.damage.map(d => ({formula: `${d.number}d${d.denomination}`, type: d.type}));
  }
}
