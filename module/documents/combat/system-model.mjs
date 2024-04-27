const {NumberField} = foundry.data.fields;

export class CombatantSystemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      pips: new NumberField({integer: true, min: 0})
    };
  }
}

export class HeroCombatantData extends CombatantSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema()
    };
  }
}
