export class ActiveEffectSystemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {};
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
}

export class EffectBuffData extends ActiveEffectSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema()
    };
  }
}
