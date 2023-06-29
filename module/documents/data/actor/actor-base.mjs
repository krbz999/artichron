import {DefensesField} from "../fields/defense.mjs";
import {PoolDieField} from "../fields/die.mjs";
import {EquippedField} from "../fields/equipped.mjs";
import {ResistancesField} from "../fields/resistance.mjs";
import {ValueField} from "../fields/value.mjs";

export class BaseActorModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      health: new foundry.data.fields.SchemaField({
        value: new ValueField(),
        max: new ValueField()
      }),
      pools: new foundry.data.fields.SchemaField({
        health: new PoolDieField(),
        stamina: new PoolDieField(),
        mana: new PoolDieField()
      }),
      ...EquippedField(),
      resistances: new ResistancesField(),
      defenses: new DefensesField()
    };
  }

  /* ---------------------------------------- */

  /** @override */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
  }
}
