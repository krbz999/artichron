import ItemSystemModel from "./system-model.mjs";
import {DamageTemplateMixin} from "./templates/damage-data.mjs";
import {FusionTemplateMixin} from "./templates/fusion-data.mjs";

const {NumberField, SchemaField} = foundry.data.fields;

export default class ArsenalData extends ItemSystemModel.mixin(
  DamageTemplateMixin,
  FusionTemplateMixin
) {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    inventorySection: "arsenal",
    fusion: true
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      wield: new SchemaField({
        value: new NumberField({
          initial: 1,
          choices: {
            1: "ARTICHRON.ItemProperty.Wield.ValueChoiceOneHanded",
            2: "ARTICHRON.ItemProperty.Wield.ValueChoiceTwoHanded"
          }
        })
      }),
      range: new SchemaField({
        value: new NumberField({integer: true, min: 1, initial: 1}),
        reach: new NumberField({integer: true, min: 0, initial: 0})
      }),
      targets: new SchemaField({
        value: new NumberField({integer: true, min: 1, initial: 1})
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.wield.value",
      "system.range.value",
      "system.range.reach",
      "system.cost.value"
    ]));
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
   * Roll damage dice to block and reduce the incoming damage.
   * @returns {Promise<ChatMessageArtichron>}     A promise that resolves to the created chat message.
   */
  async rollBlock() {
    if (!this.attributes.value.has("blocking")) {
      throw new Error("This item cannot block incoming damage!");
    }

    const formula = this._damages.map(d => d.formula).join("+");
    const roll = Roll.create(formula, this.parent.getRollData());
    if (this.parent.type !== "shield") roll.alter(0.5);

    return roll.toMessage({
      flavor: game.i18n.format("ARTICHRON.ChatMessage.BlockFlavor", {name: this.parent.name}),
      speaker: ChatMessage.implementation.getSpeaker({actor: this.parent.actor})
    });
  }

  /* -------------------------------------------------- */

  /**
   * Roll damage dice to parry and reduce the incoming damage.
   * @returns {Promise<ChatMessageArtichron>}     A promise that resolves to the created chat message.
   */
  async rollParry() {
    if (!this.attributes.value.has("parrying")) {
      throw new Error("This item cannot parry incoming damage!");
    }

    const formula = this._damages.map(d => d.formula).join("+");
    const roll = Roll.create(formula, this.parent.getRollData());
    roll.alter(0.5);

    return roll.toMessage({
      flavor: game.i18n.format("ARTICHRON.ChatMessage.ParryFlavor", {name: this.parent.name}),
      speaker: ChatMessage.implementation.getSpeaker({actor: this.parent.actor})
    });
  }
}
