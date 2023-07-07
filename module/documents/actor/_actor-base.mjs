import {buildDefenseFields} from "../fields/defense.mjs";
import {PoolDie} from "../fields/die.mjs";
import {armorFields, arsenalFields} from "../fields/equipped.mjs";
import {buildResistanceFields} from "../fields/resistance.mjs";
import {ValueField} from "../fields/value.mjs";

export class BaseActorModel extends foundry.abstract.TypeDataModel {

  static ARMS = 2;

  /** @override */
  static defineSchema() {
    return {
      health: new foundry.data.fields.SchemaField({
        value: new ValueField(),
        max: new ValueField()
      }),
      pools: new foundry.data.fields.SchemaField({
        health: new foundry.data.fields.EmbeddedDataField(PoolDie),
        stamina: new foundry.data.fields.EmbeddedDataField(PoolDie),
        mana: new foundry.data.fields.EmbeddedDataField(PoolDie)
      }),
      equipped: new foundry.data.fields.SchemaField({
        arsenal: new foundry.data.fields.SchemaField(arsenalFields(this.ARMS)),
        armor: new foundry.data.fields.SchemaField(armorFields())
      }),
      resistances: new foundry.data.fields.SchemaField(buildResistanceFields()),
      defenses: new foundry.data.fields.SchemaField(buildDefenseFields()),
      movement: new foundry.data.fields.SchemaField({
        running: new ValueField(),
        flying: new ValueField(),
        swimming: new ValueField()
      })
    };
  }
}
