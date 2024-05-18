import {ItemSystemModel} from "./system-model.mjs";
import {FusionTemplateMixin} from "./templates/fusion-data.mjs";

const {ArrayField, NumberField, SchemaField, StringField, DocumentIdField} = foundry.data.fields;

class DamageIdField extends DocumentIdField {
  /** @inheritdoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      nullable: false,
      initial: foundry.utils.randomID,
      validationError: "is not a valid ID string"
    });
  }

  /** @override */
  _cast(value) {
    return String(value);
  }
}

export default class ArsenalData extends FusionTemplateMixin(ItemSystemModel) {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    inventorySection: "arsenal",
    fusion: true
  }, {inplace: false}));

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      damage: new ArrayField(new SchemaField({
        id: new DamageIdField(),
        formula: new StringField({
          required: true,
          label: "ARTICHRON.ItemProperty.DamageFormula"
        }),
        type: new StringField({
          choices: CONFIG.SYSTEM.DAMAGE_TYPES,
          label: "ARTICHRON.ItemProperty.DamageType"
        })
      })),
      wield: new SchemaField({
        value: new NumberField({
          choices: {
            1: "ARTICHRON.ItemProperty.WieldOneHanded",
            2: "ARTICHRON.ItemProperty.WieldTwoHanded"
          },
          initial: 1,
          label: "ARTICHRON.ItemProperty.Wield"
        })
      }),
      range: new SchemaField({
        value: new NumberField({
          integer: true,
          positive: true,
          initial: 1,
          label: "ARTICHRON.ItemProperty.Range"
        })
      }),
      targets: new SchemaField({
        value: new NumberField({
          integer: true,
          positive: true,
          label: "ARTICHRON.ItemProperty.Targets"
        })
      })
    };
  }

  /** @override */
  get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.wield.value",
      "system.range.value",
      "system.damage"
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
   * Does this item have any valid damage formulas?
   * @type {boolean}
   */
  get hasDamage() {
    return this.damage.some(({formula, type}) => {
      return formula && (type in CONFIG.SYSTEM.DAMAGE_TYPES) && Roll.validate(formula);
    });
  }

  /**
   * Valid damage parts.
   * @type {object[]}
   */
  get _damages() {
    return this.damage.filter(({formula, type}) => {
      return formula && (type in CONFIG.SYSTEM.DAMAGE_TYPES) && Roll.validate(formula);
    });
  }

  /**
   * Pick targets within range of this item.
   * @param {object} [options]                        Additional options.
   * @returns {Promise<TokenDocumentArtichron[]>}     The token documents of those targeted.
   */
  async pickTarget({count = 1, ...options} = {}) {
    options.range ??= this.range.value;
    options.origin ??= this.parent.token;
    const targets = await artichron.utils.awaitTargets(count, options);
    return targets;
  }
}
