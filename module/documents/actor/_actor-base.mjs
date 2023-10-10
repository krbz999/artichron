import {buildDefenseFields} from "../fields/defense.mjs";
import {PoolDie} from "../fields/die.mjs";
import {armorFields} from "../fields/equipped.mjs";
import {buildResistanceFields} from "../fields/resistance.mjs";

export class BaseActorModel extends foundry.abstract.TypeDataModel {

  static ARMS = 2;

  /** @override */
  static defineSchema() {
    return {
      health: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({integer: true, required: true, initial: null}),
        max: new foundry.data.fields.NumberField({integer: true, required: true, initial: null})
      }),
      pools: new foundry.data.fields.SchemaField({
        health: new foundry.data.fields.EmbeddedDataField(PoolDie),
        stamina: new foundry.data.fields.EmbeddedDataField(PoolDie),
        mana: new foundry.data.fields.EmbeddedDataField(PoolDie)
      }),
      equipped: new foundry.data.fields.SchemaField({
        arsenal: new foundry.data.fields.SetField(new foundry.data.fields.DocumentIdField()),
        armor: new foundry.data.fields.SchemaField(armorFields())
      }),
      resistances: new foundry.data.fields.SchemaField(buildResistanceFields()),
      defenses: new foundry.data.fields.SchemaField(buildDefenseFields()),
      movement: new foundry.data.fields.SchemaField({
        running: new foundry.data.fields.NumberField({integer: true, required: true, initial: null}),
        flying: new foundry.data.fields.NumberField({integer: true, required: true, initial: null}),
        swimming: new foundry.data.fields.NumberField({integer: true, required: true, initial: null})
      })
    };
  }
}
