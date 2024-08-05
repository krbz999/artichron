const {SchemaField, ArrayField, StringField} = foundry.data.fields;

export const DamageTemplateMixin = Base => {
  return class DamageTemplate extends Base {
    /** @override */
    static defineSchema() {
      const schema = super.defineSchema();

      schema.damage = new SchemaField({
        parts: new ArrayField(new SchemaField({
          id: new StringField({
            initial: () => foundry.utils.randomID(),
            validate: value => foundry.data.validators.isValidId(value),
            readonly: true,
            required: true
          }),
          formula: new StringField({required: true}),
          type: new StringField({choices: CONFIG.SYSTEM.DAMAGE_TYPES})
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

      const parts = this._damages.reduce((acc, {formula, type, id}) => {
        if (!ids?.length || ids.includes(id)) acc.push({formula, type});
        return acc;
      }, []);

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

      // Add any amplifying bonuses (increasing the amount of damage dealt of a given type).
      for (const roll of rolls) {
        const group = CONFIG.SYSTEM.DAMAGE_TYPES[roll.type].group;
        const bonus = this.parent.actor.system.bonuses.damage[group];
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

      if (create) {
        const rollMode = game.settings.get("core", "rollMode");
        const messageData = {
          type: "damage",
          rolls: rolls,
          speaker: ChatMessage.implementation.getSpeaker({actor: this.parent.actor}),
          flavor: game.i18n.format("ARTICHRON.ChatMessage.DamageRoll", {name: this.parent.name}),
          "system.targets": Array.from(game.user.targets.map(t => t.actor?.uuid)),
          "system.item": this.parent.uuid
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
      const bonus = super.BONUS_FIELDS.add("system.damage.parts");
      return bonus;
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
