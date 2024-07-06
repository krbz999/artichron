import {IdField} from "../../fields/id-field.mjs";

const {SchemaField, ArrayField, NumberField, StringField} = foundry.data.fields;

export const DamageTemplateMixin = Base => {
  return class DamageTemplate extends Base {
    /** @override */
    static defineSchema() {
      const schema = super.defineSchema();

      schema.damage = new SchemaField({
        parts: new ArrayField(new SchemaField({
          id: new IdField(),
          formula: new StringField({
            required: true,
            label: "ARTICHRON.ItemProperty.Damage.Parts.Formula",
            hint: "ARTICHRON.ItemProperty.Damage.Parts.FormulaHint"
          }),
          type: new StringField({
            choices: CONFIG.SYSTEM.DAMAGE_TYPES,
            label: "ARTICHRON.ItemProperty.Damage.Parts.Type",
            hint: "ARTICHRON.ItemProperty.Damage.Parts.TypeHint"
          })
        })),
        bonuses: new ArrayField(new SchemaField({
          value: new NumberField({
            min: 0,
            integer: true,
            label: "ARTICHRON.ItemProperty.Damage.Bonuses.Value",
            hint: "ARTICHRON.ItemProperty.Damage.Bonuses.ValueHint"
          }),
          type: new StringField({
            choices: CONFIG.SYSTEM.DAMAGE_TYPES,
            initial: () => Object.keys(CONFIG.SYSTEM.DAMAGE_TYPES)[0],
            label: "ARTICHRON.ItemProperty.Damage.Bonuses.Type",
            hint: "ARTICHRON.ItemProperty.Damage.Bonuses.TypeHint"
          })
        }))
      });

      return schema;
    }

    /* -------------------------------------------------- */
    /*   Instance methods                                 */
    /* -------------------------------------------------- */

    /**
     * Perform a damage roll.
     * @param {object} [config]                 Damage roll configuration.
     * @param {string[]} [config.ids]           The ids of the damage roll to use. If excluded, uses all rolls.
     * @param {ItemArtichron} [config.ammo]     Ammunition item for modifying the damage roll.
     * @param {number} [config.multiply]        The number to muliply all dice amounts by.
     * @param {number} [config.addition]        The number of additional dice to add to the formulas.
     * @param {object} [options]                Options that modify the chat message.
     * @param {boolean} [options.create]        Whether to create the chat message or return the rolls.
     */
    async rollDamage({ids, ammo, multiply, addition} = {}, {create = true} = {}) {
      if (!this.hasDamage) {
        ui.notifications.warn("ARTICHRON.Warning.ItemHasNoDamageRolls", {localize: true});
        return null;
      }

      const rollData = this.parent.getRollData();
      if (ammo) rollData.ammo = ammo.getRollData().item;

      let parts = foundry.utils.deepClone(this._damages);
      if (ids?.length) parts = parts.filter(p => ids.includes(p.id));
      const mods = ammo ? ammo.system.ammoProperties : new Set();

      if (mods.has("damageOverride")) {
        const override = ammo.system.damage.override;
        for (const p of parts) {
          if ((override.group === "all") || (CONFIG.SYSTEM.DAMAGE_TYPES[p.type].group === override.group)) {
            p.type = override.value;
          }
        }
      }

      if (mods.has("damageParts")) {
        parts.push(...ammo.system._damages);
      }

      const rolls = Object.entries(parts.reduce((acc, d) => {
        acc[d.type] ??= [];
        acc[d.type].push(d.formula);
        return acc;
      }, {})).map(([type, formulas]) => {
        const roll = new CONFIG.Dice.DamageRoll(formulas.join("+"), rollData, {type: type});
        roll.alter(multiply ?? 1, addition ?? 0);
        return roll;
      });

      for (const roll of rolls) await roll.evaluate();
      const preTotal = rolls.reduce((acc, roll) => acc + roll.total, 0);

      // Add any percentage bonuses.
      const pcts = new Map();
      for (const {value, type} of this.damage.bonuses) {
        if (!value) continue;
        const total = pcts.get(type) ?? 0;
        pcts.set(type, total + value);
      }
      for (const [type, value] of pcts.entries()) {
        const total = Math.max(1, Math.round(preTotal * (value / 100)));
        const roll = rolls.find(roll => roll.type === type);
        if (roll) {
          const terms = [
            new foundry.dice.terms.OperatorTerm({operator: "+"}),
            new foundry.dice.terms.NumericTerm({number: total})
          ];
          for (const term of terms) {
            term._evaluated = true;
            roll.terms.push(term);
          }
          roll.resetFormula();
          roll._total = roll._evaluateTotal();
        } else {
          const roll = new CONFIG.Dice.DamageRoll(String(total), {}, {type: type});
          await roll.evaluate();
          rolls.push(roll);
        }
      }

      if (create) {
        const rollMode = game.settings.get("core", "rollMode");
        const messageData = {
          rolls: rolls,
          speaker: ChatMessage.implementation.getSpeaker({actor: this.parent.actor})
        };
        ChatMessage.implementation.applyRollMode(messageData, rollMode);
        return ChatMessage.implementation.create(messageData);
      } else {
        return rolls;
      }
    }

    /* -------------------------------------------------- */
    /*   Properties                                       */
    /* -------------------------------------------------- */

    /** @override */
    static get BONUS_FIELDS() {
      return super.BONUS_FIELDS.union(new Set(["system.damage.parts"]));
    }

    /* -------------------------------------------------- */

    /**
     * Does this item have any valid damage formulas?
     * @type {boolean}
     */
    get hasDamage() {
      const parts = this.damage?.parts;
      if (!parts) return false;
      return parts.some(({formula, type}) => {
        return formula && (type in CONFIG.SYSTEM.DAMAGE_TYPES) && Roll.validate(formula);
      });
    }

    /* -------------------------------------------------- */

    /**
     * Valid damage parts.
     * @type {object[]}
     */
    get _damages() {
      const parts = this.damage?.parts;
      if (!parts) return [];
      return parts.filter(({formula, type}) => {
        return formula && (type in CONFIG.SYSTEM.DAMAGE_TYPES) && Roll.validate(formula);
      });
    }
  };
};
