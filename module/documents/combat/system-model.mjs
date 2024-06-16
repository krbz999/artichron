const {NumberField} = foundry.data.fields;

export default class CombatantSystemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      pips: new NumberField({
        integer: true,
        min: 0,
        initial: 0,
        nullable: false,
        label: "ARTICHRON.CombatantProperty.Pip",
        hint: "ARTICHRON.CombatantProperty.PipHint"
      })
    };
  }
}
