import {DamageModel} from "../fields/damage.mjs";
import {ItemSystemModel} from "./system-model.mjs";
import * as utils from "../../helpers/utils.mjs";

const {ArrayField, NumberField, SchemaField, EmbeddedDataField} = foundry.data.fields;

export default class ArsenalData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      damage: new ArrayField(new EmbeddedDataField(DamageModel)),
      wield: new SchemaField({
        value: new NumberField({
          choices: {
            1: "ARTICHRON.ItemProperty.WieldOneHanded",
            2: "ARTICHRON.ItemProperty.WieldTwoHanded"
          },
          initial: 1
        }),
        range: new NumberField({integer: true, positive: true, initial: 1})
      })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const rollData = this.parent.getRollData();
    this.damage.forEach(v => v.prepareDerivedData(rollData));
    return rollData;
  }

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "wield.range"
    ]));
  }

  /**
   * Is this a one-handed item?
   * @type {boolean}
   */
  get isOneHanded() {
    return this.wield.value === 1;
  }

  /**
   * Is this a two-handed item?
   * @type {boolean}
   */
  get isTwoHanded() {
    return this.wield.value === 2;
  }

  /**
   * Pick targets within range of this item.
   * @param {object} [options]                        Additional options.
   * @returns {Promise<TokenDocumentArtichron[]>}     The token documents of those targeted.
   */
  async pickTarget({count = 1, ...options} = {}) {
    options.range ??= this.wield.range;
    options.origin ??= this.parent.token;
    const targets = await utils.awaitTargets(count, options);
    return targets;
  }
}
