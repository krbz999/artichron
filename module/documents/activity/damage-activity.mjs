import ActivityUseDialog from "../../applications/item/activity-use-dialog.mjs";
import BaseActivity from "./base-activity.mjs";
import ChatMessageArtichron from "../chat-message.mjs";

const {ArrayField, NumberField, SchemaField, StringField} = foundry.data.fields;

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
  static metadata = Object.freeze({
    type: "damage",
    label: "ARTICHRON.ACTIVITY.Types.Damage"
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      ammunition: new SchemaField({
        type: new StringField({
          required: false,
          blank: true,
          choices: CONFIG.SYSTEM.AMMUNITION_TYPES
        })
      }),
      damage: new ArrayField(new SchemaField({
        formula: new StringField({required: true}),
        type: new StringField({
          required: true,
          choices: CONFIG.SYSTEM.DAMAGE_TYPES,
          initial: "physical"
        })
      })),
      target: targetField()
    });
  }

  /* -------------------------------------------------- */

  /**
   * Stored references of what ammunition is default set for damage rolls.
   * @type {Map<string, string>}
   */
  static ammunitionRegistry = new Map();

  /* -------------------------------------------------- */

  /** @override */
  async use() {
    if (!this.hasDamage) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoDamage", {localize: true});
      return null;
    }

    const configuration = await ActivityUseDialog.create(this);
    if (!configuration) return null;

    const config = foundry.utils.mergeObject({
      ammunition: null,
      area: 0,
      damage: 0,
      elixirs: [],
      rollMode: game.settings.get("core", "rollMode")
    }, configuration);

    const actor = this.item.actor;
    const item = this.item;
    const ammo = item.actor.items.get(config.ammunition) ?? null;

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
      roll.alter(1, config.damage);
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

    // Consume AP.
    if (actor.inCombat) {
      const consume = await this.consumeCost();
      if (consume === null) return null;
    }

    // Consume ammo.
    if (ammo) await ammo.update({"system.quantity.value": ammo.system.quantity.value - 1});

    // Consume pool.
    const path = (actor.type === "monster") ? "system.danger.pool.spent" : `system.pools.${this.poolType}.spent`;
    const spent = foundry.utils.getProperty(actor, path);
    await actor.update({[path]: spent + Math.max(0, config.area + config.damage - config.elixirs.length)});

    // Update elixirs.
    if (config.elixirs.length) {
      const updates = [];
      for (const id of config.elixirs) {
        const elixir = actor.items.get(id);
        updates.push(elixir.system._usageUpdate());
      }
      await actor.updateEmbeddedDocuments("Item", updates);
    }

    // Place templates.
    if (this.hasTemplate) await this.placeTemplate({increase: config.area});

    const messageData = {
      type: "usage",
      rolls: rolls,
      speaker: ChatMessageArtichron.getSpeaker({actor: actor}),
      "system.activity": this.id,
      "system.item": item.uuid,
      "system.targets": Array.from(game.user.targets.map(t => t.actor?.uuid)),
      "flags.artichron.usage": config,
      "flags.artichron.type": "damage"
    };
    ChatMessageArtichron.applyRollMode(messageData, config.rollMode);
    return ChatMessageArtichron.create(messageData);
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Does this item have any valid damage formulas?
   * @type {boolean}
   */
  get hasDamage() {
    return this.damage.some(({formula, type}) => {
      return formula && (type in CONFIG.SYSTEM.DAMAGE_TYPES) && Roll.validate(formula);
    });
  }

  /* -------------------------------------------------- */

  /**
   * Valid damage parts.
   * @type {object[]}
   */
  get _damages() {
    return this.damage.filter(({formula, type}) => {
      return formula && (type in CONFIG.SYSTEM.DAMAGE_TYPES) && Roll.validate(formula);
    });
  }

  /* -------------------------------------------------- */

  /**
   * Does this activity make use of ammo?
   * @type {boolean}
   */
  get usesAmmo() {
    return !!this.ammunition.type;
  }
}
