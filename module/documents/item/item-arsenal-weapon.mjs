import ArsenalData from "./item-arsenal.mjs";
import MeasuredTemplateArtichron from "../object-classes/measured-template.mjs";

const {NumberField, SchemaField, StringField} = foundry.data.fields;

export default class WeaponData extends ArsenalData {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultWeight: 2,
    order: 10,
    type: "weapon"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema()
    };
  }

  /* -------------------------------------------------- */

  /**
   * Create a blast zone as product of some ammunition.
   * @param {TokenArtichron} origin                             The token of the attacker.
   * @param {TokenArtichron} target                             The token of the target.
   * @param {object} [options]                                  Template shape options.
   * @param {string} [options.type]                             The shape type of the blast zone.
   * @param {number} [options.size]                             The distance of the blast zone.
   * @returns {Promise<MeasuredTemplateDocumentArtichron>}      A promise that resolves to the created template.
   */
  static async createBlastZone(origin, target, {type = "ray", size = 1} = {}) {
    const ray = Ray.towardsPoint(origin.center, target.center, 1);
    const templateData = MeasuredTemplateArtichron.fromData({
      ...target.center,
      t: type,
      direction: Math.toDegrees(ray.angle),
      distance: size
    }).document.toObject();
    return getDocumentClass("MeasuredTemplate").create(templateData, {parent: canvas.scene});
  }

  /* -------------------------------------------------- */

  async createBlastZone(target, {type = "ray", size = 1} = {}) {
    const origin = this.parent.token;
    return this.constructor.createBlastZone(origin, target, {type, size});
  }
}
