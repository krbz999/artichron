import {IdField} from "../fields/id-field.mjs";
import {ItemSystemModel} from "./system-model.mjs";
import {FusionTemplateMixin} from "./templates/fusion-data.mjs";

const {ArrayField, NumberField, SchemaField, StringField} = foundry.data.fields;

export default class ArsenalData extends FusionTemplateMixin(ItemSystemModel) {
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
      damage: new SchemaField({
        parts: new ArrayField(new SchemaField({
          id: new IdField(),
          formula: new StringField({
            required: true,
            label: "ARTICHRON.ItemProperty.Damage.Parts.Formula",
            hint: "ARTICHRON.ItemProperty.Damage.Parts.FormulaHint"
          }),
          type: new StringField({
            choices: CONFIG.SYSTEM.DAMAGE_TYPES,
            label: "ARTICHRON.ItemProperty.Damage.Parts.Type",
            hint: "ARTICHRON.ItemProperty.Damage.Parts.TypeHint"
          })
        }))
      }),
      wield: new SchemaField({
        value: new NumberField({
          choices: {
            1: "ARTICHRON.ItemProperty.Wield.ValueChoiceOneHanded",
            2: "ARTICHRON.ItemProperty.Wield.ValueChoiceTwoHanded"
          },
          initial: 1,
          label: "ARTICHRON.ItemProperty.Wield.Value",
          hint: "ARTICHRON.ItemProperty.Wield.ValueHint"
        })
      }),
      range: new SchemaField({
        value: new NumberField({
          integer: true,
          positive: true,
          initial: 1,
          label: "ARTICHRON.ItemProperty.Range.Value",
          hint: "ARTICHRON.ItemProperty.Range.ValueHint"
        })
      }),
      targets: new SchemaField({
        value: new NumberField({
          integer: true,
          positive: true,
          initial: 1,
          label: "ARTICHRON.ItemProperty.Targets.Value",
          hint: "ARTICHRON.ItemProperty.Targets.ValueHint"
        })
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.wield.value",
      "system.range.value",
      "system.damage.parts",
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
  async pickTarget({count = 1, ...options} = {}) {
    options.range ??= this.range.value;
    options.origin ??= this.parent.token;
    const targets = await artichron.utils.awaitTargets(count, options);
    return targets;
  }

  /* -------------------------------------------------- */

  /**
   * Display the result of this item's usage in the chat log.
   * @param {object} [config]
   * @param {DamageRoll[]} [config.rolls]
   * @param {string[]} [config.targets]
   * @param {string} [config.effectUuid]
   * @param {string} [config.flavor]
   * @param {object} [options]
   * @param {string} [options.rollMode]
   * @param {boolean} [options.create]
   * @returns {Promise<ChatMessage|object>}     A promise that resolves to the created chat message or message data.
   */
  async toMessage({rolls = [], targets = [], template, effectUuid, flavor} = {}, {rollMode, create = true} = {}) {
    // Evaluate unevaluated rolls.
    for (const roll of rolls) {
      if (!roll.evaluated) await roll.evaluate();
    }

    // Set up message data.
    const messageData = {
      type: "usage",
      rolls: rolls,
      speaker: ChatMessage.implementation.getSpeaker({actor: this.parent.actor}),
      "system.item": this.parent.uuid,
      "system.actor": this.parent.actor.uuid,
      flavor: flavor
    };
    if (rolls.length) {
      messageData.sound = CONFIG.sounds.dice;
      messageData.rollMode = rollMode ? rollMode : game.settings.get("core", "rollMode");
    }
    if (targets.length) messageData["system.targets"] = targets;
    if (template) messageData["flags.artichron.use.templateData"] = foundry.utils.deepClone(template);
    if (effectUuid) messageData["system.effect"] = effectUuid;

    // Display the message or return the message data.
    return create ? ChatMessage.implementation.create(messageData) : messageData;
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
    const flavor = game.i18n.format("ARTICHRON.ChatMessage.BlockFlavor", {name: this.parent.name});

    return this.toMessage({rolls: [roll], flavor});
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
    const flavor = game.i18n.format("ARTICHRON.ChatMessage.ParryFlavor", {name: this.parent.name});

    return this.toMessage({rolls: [roll], flavor});
  }
}
