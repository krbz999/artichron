import BaseDocumentMixin from "./base-document-mixin.mjs";

/**
 * Base token document class.
 * @extends foundry.documents.TokenDocument
 * @mixes BaseDocumentMixin
 */
export default class TokenDocumentArtichron extends BaseDocumentMixin(foundry.documents.TokenDocument) {
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

    const { x, y, elevation } = this;

    for (const token of tokens) {
      (async function() {
        await token.document.move(
          { x, y, elevation, action: "walk" },
          { autoRotate: true, showRuler: true },
        );
        await token.movementAnimationPromise;
        token.document.delete();
      })();
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  getBarAttribute(barName, { alternative } = {}) {
    const bar = super.getBarAttribute(barName, { alternative });
    if (bar === null) return null;

    let { type, attribute, value, max, editable } = bar;

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
    operation[this.id] = { pips: consumed };
    await this.actor.update({ "system.pips.value": resource - consumed });
  }

  /* -------------------------------------------------- */

  /**
   * Get the top left point of the token.
   * @param {Partial<ElevatedPoint & TokenDimensions>} [data]
   */
  getTopLeftFromCenter(data = {}) {
    const center = this.getCenterPoint(data);
    const { width, height } = this.getSize(data);
    return { x: center.x - width, y: center.y - height };
  }

  /* -------------------------------------------------- */

  /**
   * Forcibly move another token on the same scene, either towards this token or away.
   * This forced movement respects wall collisions.
   * @param {TokenDocumentArtichron} token      The other token to move.
   * @param {object} [options={}]               Force movement options.
   * @param {number} [options.distance=10]      The distance to push or pull.
   * @param {boolean} [options.isPull=false]    Is this a pull?
   * @returns {Promise}
   */
  async forceMove(token, { distance = 10, isPull = false } = {}) {
    distance = Math.abs(distance);
    const scene = this.parent;
    const object = this.object;
    if ((token.parent !== scene) || !object) {
      throw new Error("You cannot force move a token on a different scene!");
    }

    const origin = this.getCenterPoint();
    const target = token.getCenterPoint();
    const separated = object.checkCollision(target, { origin, mode: "any" });
    if (separated) return;
    const ray = new foundry.canvas.geometry.Ray(isPull ? target : origin, isPull ? origin : target);
    const translated = scene.grid.getTranslatedPoint(target, Math.toDegrees(ray.angle), distance);
    const waypoint = { ...scene.grid.getTopLeftPoint(translated), snapped: true };
    await token.move(waypoint);
  }

  /* -------------------------------------------------- */

  /**
   * Pull this token towards another token.
   * @param {TokenDocumentArtichron} token    The token to pull towards.
   * @param {object} [options={}]             Force movement options.
   * @param {number} [options.distance]       The distance to pull.
   * @returns {Promise}
   */
  async pullTowards(token, { distance } = {}) {
    return token.forceMove(this, { distance, isPull: true });
  }

  /* -------------------------------------------------- */

  /**
   * Push this token away from another token.
   * @param {TokenDocumentArtichron} token    The token to pull towards.
   * @param {object} [options={}]             Force movement options.
   * @param {number} [options.distance]       The distance to pull.
   * @returns {Promise}
   */
  async pushAwayFrom(token, { distance } = {}) {
    return token.forceMove(this, { distance, isPull: false });
  }
}
