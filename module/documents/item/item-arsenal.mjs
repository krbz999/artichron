import FusionTemplateMixin from "./templates/fusion-data.mjs";
import ItemSystemModel from "./system-model.mjs";

const {NumberField, SchemaField} = foundry.data.fields;

export default class ArsenalData extends ItemSystemModel.mixin(
  FusionTemplateMixin
) {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    fusion: true,
    inventorySection: "arsenal"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      wield: new SchemaField({
        value: new NumberField({initial: 1, choices: CONFIG.SYSTEM.WIELDING_TYPES})
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    const bonus = super.BONUS_FIELDS;
    bonus.add("system.wield.value");
    return bonus;
  }

  /* -------------------------------------------------- */

  /**
   * Is this a one-handed item?
   * @type {boolean}
   */
  get isOneHanded() {
    return this.wield.value === 1;
  }

  /* -------------------------------------------------- */

  /**
   * Is this a two-handed item?
   * @type {boolean}
   */
  get isTwoHanded() {
    return this.wield.value === 2;
  }

  /* -------------------------------------------------- */

  /**
   * Can this item be used to make an attack due to action point cost?
   * @type {boolean}
   */
  get canUsePips() {
    return this.parent.actor.canPerformActionPoints(this.cost.value);
  }

  /* -------------------------------------------------- */

  /**
   * Pick targets within range of this item.
   * @param {object} [options]                        Additional options.
   * @returns {Promise<TokenDocumentArtichron[]>}     The token documents of those targeted.
   */
  async pickTarget({origin, count, range, allowPreTarget} = {}) {
    origin ??= this.parent.token;
    count ??= 1;
    range ??= this.range.value;
    allowPreTarget ??= false;
    const targets = await artichron.utils.awaitTargets(count, {origin, range, allowPreTarget});
    return targets;
  }

  /* -------------------------------------------------- */

  /**
   * Roll damage dice to block or parry and reduce the incoming damage.
   * @param {string} [type]                       The type of defense roll ('block' or 'parry').
   * @returns {Promise<ChatMessageArtichron>}     A promise that resolves to the created chat message.
   */
  async rollDefense(type) {
    if (!["block", "parry"].includes(type)) {
      type = this.attributes.value.has("blocking") ? "block" : "parry";
    }

    if ((type === "block") && !this.attributes.value.has("blocking")) {
      throw new Error("This item cannot block incoming damage!");
    }

    if ((type === "parry") && !this.attributes.value.has("parrying")) {
      throw new Error("This item cannot parry incoming damage!");
    }

    const formula = this._damages.map(d => d.formula).join("+");
    const roll = Roll.create(formula, this.parent.getRollData());
    if (type === "parry") roll.alter(0.5);

    return roll.toMessage({
      flavor: game.i18n.format(`ARTICHRON.ChatMessage.${type.capitalize()}Flavor`, {name: this.parent.name}),
      speaker: ChatMessage.implementation.getSpeaker({actor: this.parent.actor})
    });
  }
}
