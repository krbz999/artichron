import DefenseModel from "../fields/defense.mjs";
import {PoolDie} from "../fields/die.mjs";
import ResistanceModel from "../fields/resistance.mjs";
import {SYSTEM} from "../../helpers/config.mjs";

export class ActorSystemModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      health: new fields.SchemaField({
        value: new fields.NumberField({integer: true, required: true, initial: null}),
        max: new fields.NumberField({integer: true, required: true, initial: null})
      }),
      pools: new fields.SchemaField({
        health: new fields.EmbeddedDataField(PoolDie),
        stamina: new fields.EmbeddedDataField(PoolDie),
        mana: new fields.EmbeddedDataField(PoolDie)
      }),
      equipped: new fields.SchemaField({
        arsenal: new fields.SchemaField({
          first: new fields.StringField({nullable: true}),
          second: new fields.StringField({nullable: true})
        }),
        armor: new fields.SchemaField(Object.keys(SYSTEM.ARMOR_TYPES).reduce((acc, key) => {
          acc[key] = new fields.StringField({nullable: true});
          return acc;
        }, {})),
        ammo: new fields.SetField(new fields.StringField())
      }),
      resistances: new fields.SchemaField(Object.entries(SYSTEM.DAMAGE_TYPES).reduce((acc, [key, data]) => {
        if (data.resist) acc[key] = new fields.EmbeddedDataField(ResistanceModel);
        return acc;
      }, {})),
      defenses: new foundry.data.fields.SchemaField(Object.keys(SYSTEM.DEFENSE_TYPES).reduce((acc, key) => {
        acc[key] = new fields.EmbeddedDataField(DefenseModel);
        return acc;
      }, {})),
      movement: new foundry.data.fields.SchemaField({
        running: new foundry.data.fields.NumberField({integer: true, required: true, initial: null}),
        flying: new foundry.data.fields.NumberField({integer: true, required: true, initial: null}),
        swimming: new foundry.data.fields.NumberField({integer: true, required: true, initial: null})
      })
    };
  }

  /* ---------------------------------------- */
  /*                                          */
  /*            PREPARATION METHODS           */
  /*                                          */
  /* ---------------------------------------- */

  /** @override */
  prepareDerivedData() {
    this._prepareEquipped();
  }

  /** Prepare equipped items. */
  _prepareEquipped() {
    const {arsenal, armor, ammo} = this.equipped;
    for (const key in arsenal) {
      const item = this.parent.items.get(arsenal[key]);
      arsenal[key] = (item && (item.type === "arsenal")) ? item : null;
    }
    for (const key in armor) {
      const item = this.parent.items.get(armor[key]);
      armor[key] = (item && (item.type === "armor") && (item.system.type.category === key)) ? item : null;
    }
    this.equipped.ammo = ammo.reduce((acc, id) => {
      const item = this.parent.items.get(id);
      if (item && item.isAmmo) acc.add(item);
      return acc;
    }, new Set());
  }
}
