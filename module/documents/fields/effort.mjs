const {SchemaField, BooleanField, StringField} = foundry.data.fields;

export class EffortModel extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      resource: new StringField({required: true, initial: "stamina"}),
      bonuses: new SchemaField({}),
      modifiers: new SchemaField({
        r: new StringField({required: true}),
        x: new StringField({required: true}),
        min: new StringField({required: true}),
        max: new StringField({required: true}),
        xo: new BooleanField(),
        rr: new BooleanField()
      })
    };
  }

  /**
   * Prepare derived values.
   * @param {object} rollData     Roll data object provided by the parent actor.
   */
  prepareDerivedData(rollData) {
    const sourceMods = this.parent.pools[this.resource].modifiers;
    ["r", "x", "min", "max"].forEach(k => {
      const value = artichron.utils.simplifyFormula(this.modifiers[k], rollData);
      this.modifiers[k] = Math.max(0, value, sourceMods[k]);
    });

    const {r, x, min, max, xo, rr} = this.modifiers;
    let mods = "";

    if ((r > 0) && (r < this.faces)) {
      const o = (r === 1) ? "=" : "<=";
      mods += rr ? `rr${o}${r}` : `r${o}${r}`;
    }

    if ((x > 0) && (x < this.faces)) {
      const o = (x === 1) ? "=" : ">=";
      mods += xo ? `xo${o}${this.faces - x + 1}` : `x${o}${this.faces - x + 1}`;
    }

    if ((min > 0) && (min < this.faces)) {
      mods += `min${min}`;
    }

    if ((max > 0) && (max < this.faces)) {
      mods += `max${this.faces - max}`;
    }
    this.mods = mods;
  }

  get faces() {
    return this.parent.pools[this.resource].faces;
  }

  /**
   * The die, with modifiers.
   * @type {string}
   */
  get die() {
    return `${this.parent.pools[this.resource].denom}${this.mods}`;
  }

  get formula() {
    return `1${this.die}`;
  }
}
