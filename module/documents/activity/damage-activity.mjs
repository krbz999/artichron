import BaseActivity from "./base-activity.mjs";
import ChatMessageArtichron from "../chat-message.mjs";
import CollectionField from "../data/fields/collection-field.mjs";
import DamageFormulaModel from "../data/damage-formula-model.mjs";

const { NumberField, SchemaField, StringField } = foundry.data.fields;

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

export default class DamageActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultName: "ARTICHRON.ACTIVITY.Types.DamageDefaultName",
    label: "ARTICHRON.ACTIVITY.Types.Damage",
  }, { inplace: false }));

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      damage: new CollectionField(DamageFormulaModel),
      target: targetField(),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "damage";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async use(usage = {}, dialog = {}, message = {}) {
    if (!this.hasDamage) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoDamage", { localize: true });
      return null;
    }

    const configuration = await this.configure(usage, dialog, message);
    if (!configuration) return null;

    const actor = this.item.actor;
    const item = this.item;
    const ammo = item.actor.items.get(configuration.usage.damage?.ammoId) ?? null;
    const activity = this.clone();

    const rollData = activity.getRollData();
    if (ammo) rollData.ammo = ammo.getRollData().item;
    const mods = ammo ? ammo.system.ammoProperties : new Set();

    // Create roll instances.
    const rolls = [];
    for (const part of activity.damage) {
      let type = part.type;

      // Override the damage type due to ammunition.
      if (mods.has("override")) {
        const override = ammo.system.override;
        if ((override.group === "all") || (artichron.config.DAMAGE_TYPES[p.type].group === override.group)) {
          type = override.value;
        }
      }

      const choices = part.schema.getField("options.element").choices();
      const damageOptions = new Set();
      for (const k of Object.keys(choices)) {
        if (item.system.attributes?.value?.has(k) || part.options.has(k)) damageOptions.add(k);
      }

      // Damage modifier.
      let multiplier = actor.system.bonuses.damage[artichron.config.DAMAGE_TYPES[type].group];
      multiplier = 1 + multiplier / 100;

      const roll = new CONFIG.Dice.DamageRoll(part.formula, rollData, {
        type: type,
        damageOptions: Array.from(damageOptions),
        multiplier: multiplier,
      });
      if (configuration.usage.damage?.increase) roll.alter(1, configuration.usage.damage.increase);
      await roll.evaluate();
      rolls.push(roll);
    }

    // Add any amplifying bonuses (increasing the amount of damage dealt of a given type).
    // for (const roll of rolls) {
    //   const group = artichron.config.DAMAGE_TYPES[roll.type].group;
    //   const bonus = actor.system.bonuses.damage[group];
    //   if (!bonus) continue;
    //   const terms = [
    //     new foundry.dice.terms.OperatorTerm({operator: (bonus > 0) ? "+" : "-"}),
    //     new foundry.dice.terms.NumericTerm({number: Math.ceil(roll.total * Math.abs(bonus) / 100)})
    //   ];
    //   for (const term of terms) {
    //     term._evaluated = true;
    //     roll.terms.push(term);
    //   }
    //   roll.resetFormula();
    //   roll._total = roll._evaluateTotal();
    // }

    const consumed = await this.consume(configuration.usage);
    if (!consumed) return null;

    await item.setFlag("artichron", `usage.${this.id}`, {
      "damage.ammoId": foundry.utils.getProperty(configuration.usage, "damage.ammoId") ?? null,
      "rollMode.mode": foundry.utils.getProperty(configuration.usage, "rollMode.mode"),
      "template.place": foundry.utils.getProperty(configuration.usage, "template.place") ?? true,
    });

    // Place templates.
    if (configuration.usage.template?.place) await this.placeTemplate({ increase: configuration.usage.template.increase });

    const messageData = {
      type: "usage",
      rolls: rolls,
      speaker: ChatMessageArtichron.getSpeaker({ actor: actor }),
      "system.activity": this.id,
      "system.item": item.uuid,
      "system.targets": Array.from(game.user.targets.map(t => t.actor?.uuid)),
      "flags.artichron.usage": configuration.usage,
      "flags.artichron.type": DamageActivity.metadata.type,
    };
    ChatMessageArtichron.applyRollMode(messageData, configuration.usage.rollMode.mode);
    foundry.utils.mergeObject(messageData, configuration.message);
    return ChatMessageArtichron.create(messageData);
  }

  /* -------------------------------------------------- */

  /**
   * Create a new damage part.
   * @param {object} [data]     Damage part data.
   * @returns {Promise}
   */
  async createDamage(data = {}) {
    const id = foundry.utils.randomID();
    const path = `damage.${id}`;
    return this.update({ [path]: { ...data, _id: id } });
  }

  /* -------------------------------------------------- */

  /**
   * Delete a damage part.
   * @param {string} id     The id of the damage part.
   * @returns {Promise}
   */
  async deleteDamage(id) {
    return this.damage.get(id).delete();
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  get hasDamage() {
    return this.damage.size > 0;
  }
}
