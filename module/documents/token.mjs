export default class TokenDocumentArtichron extends TokenDocument {
  /**
   * Recall members of a party.
   */
  async recallMembers() {
    const object = this.object;
    if (!object) throw new Error("This token is not visible on the canvas!");

    if (this.actor?.type !== "party") {
      throw new Error("This token document does not belong to a Party actor!");
    }

    const tokens = [];
    for (const { actor } of this.actor.system.members) {
      for (const token of actor.getActiveTokens()) {
        if (!token.actor.isToken) tokens.push(token);
      }
    }

    const options = { autoRotate: true, animation: { duration: 1000, easing: "easeInOutCosine" } };
    await Promise.all(tokens.map(token => token.document.move([{
      x: this.x, y: this.y, elevation: this.elevation,
    }], options)));
    const ids = tokens.map(token => token.id);

    for (const token of tokens) await token.movementAnimationPromise;
    this.parent.deleteEmbeddedDocuments("Token", ids);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  getBarAttribute(barName, { alternative } = {}) {
    const bar = super.getBarAttribute(barName, { alternative });
    if (bar === null) return null;

    let max;
    let { type, attribute, value, editable } = bar;

    // Adjustments made for things that use "spent" instead of "value" in the schema.
    if ((type === "value") && attribute.endsWith(".spent")) {
      const object = foundry.utils.getProperty(this.actor.system, attribute.slice(0, attribute.lastIndexOf(".")));
      value = object.value;
      max = object.max;
      type = "bar";
      editable = true;
    } else if (type === "bar") {
      editable = true;
    }

    return { type, attribute, value, max, editable };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static _getTrackedAttributesFromSchema(schema, _path = []) {
    const attributes = { bar: [], value: [] };
    for (const [name, field] of Object.entries(schema.fields)) {
      const p = _path.concat([name]);
      if (field instanceof foundry.data.fields.NumberField) attributes.value.push(p);
      const isSchema = field instanceof foundry.data.fields.SchemaField;
      const isModel = field instanceof foundry.data.fields.EmbeddedDataField;
      if (isSchema || isModel) {
        const schema = isModel ? field.model.schema : field;
        const isBar = ((schema.has("value") || schema.has("spent")) && schema.has("max")) || schema.options.trackedAttribute;
        if (isBar) attributes.bar.push(p);
        else {
          const inner = this.getTrackedAttributes(schema, p);
          attributes.bar.push(...inner.bar);
          attributes.value.push(...inner.value);
        }
      }
    }
    return attributes;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preUpdateMovement(movement, operation) {
    if (!this.actor?.system.pips || !this.actor.inCombat) return;
    const resource = this.actor.system.pips.value;
    const distance = movement.passed.cost; // Current segment.
    const consumed = (distance / 5).toNearest(0.2, "ceil");
    if (consumed > resource) {
      ui.notifications.warn("You do not have enough AP.");
      return false;
    }
    await this.actor.update({ "system.pips.value": resource - consumed });
  }
}
