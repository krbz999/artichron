const {DocumentUUIDField} = foundry.data.fields;

export class ActiveEffectSystemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      source: new DocumentUUIDField({type: "Item", embedded: true, label: "ARTICHRON.EffectProperty.Source"})
    };
  }
}

export class EffectFusionData extends ActiveEffectSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema()
    };
  }

  /** @override */
  prepareDerivedData() {
    this.parent.transfer = false;
  }

  /**
   * The fields this effect may apply to.
   * @type {Set<string>}
   */
  get BONUS_FIELDS() {
    return this.parent.parent.system.BONUS_FIELDS;
  }
}

export class EffectBuffData extends ActiveEffectSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema()
    };
  }
}
