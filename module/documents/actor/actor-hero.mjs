import CreatureData from "./creature-data.mjs";
import ProgressionData from "../data/hero-progression.mjs";

import * as TYPES from "../../helpers/types.mjs";

const { ArrayField, HTMLField, NumberField, SchemaField, TypedSchemaField } = foundry.data.fields;

export default class HeroData extends CreatureData {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ActorSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "hero",
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const schema = super.defineSchema();

    const poolSchema = () => {
      return new SchemaField({
        base: new NumberField({ min: 0, integer: true, initial: 0, nullable: false }),
        faces: new NumberField({ min: 0, integer: true, initial: 0, nullable: false }),
        increase: new NumberField({ min: 0, integer: true, initial: 0, nullable: false }),
        spent: new NumberField({ min: 0, integer: true, initial: 0 }),
      });
    };

    schema.pools = new SchemaField({
      health: poolSchema(),
      stamina: poolSchema(),
      mana: poolSchema(),
    });

    schema.skills = new SchemaField(Object.entries(artichron.config.SKILLS).reduce((acc, [k, v]) => {
      acc[k] = new SchemaField({
        number: new NumberField({ integer: true, min: 2, initial: 2, nullable: false }),
        bonus: new NumberField({ integer: true, min: 0, initial: 0 }),
      });
      return acc;
    }, {}));

    schema.details = new SchemaField({
      notes: new HTMLField({ required: true }),
    });

    schema.progression = new SchemaField({
      points: new SchemaField({
        total: new NumberField({ min: 0, integer: true, initial: 0, nullable: false }),
        spent: new ArrayField(new TypedSchemaField(ProgressionData.TYPES)),
      }),
    });

    return schema;
  }

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareBaseData() {
    super.prepareBaseData();

    // Set pool maximums.
    for (const [k, v] of Object.entries(this.pools)) {
      v.max = v.base + v.increase;
    }

    // Set the available number of progression points.
    const spent = this.progression.points.spent.reduce((acc, p) => acc + p.value, 0);
    this.progression.points.available = this.progression.points.total - spent;

    const progression = artichron.config.PROGRESSION_THRESHOLDS.toReversed().find(p => {
      return this.progression.points.total >= p.threshold;
    });
    this.progression.level = progression.level;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Pools are prepared first as most other properties rely on these.
    this.#preparePools();
    this.#prepareEncumbrance();
    this.#prepareHealth();
  }

  /* -------------------------------------------------- */

  /** Prepare pools. */
  #preparePools() {
    for (const k of ["health", "stamina", "mana"]) {
      const value = this.pools[k].max - this.pools[k].spent;
      this.pools[k].value = Math.max(0, value);
      this.pools[k].pct = Math.round(this.pools[k].value / this.pools[k].max * 100);
    }
  }

  /* -------------------------------------------------- */

  /** Prepare current and max encumbrance. */
  #prepareEncumbrance() {
    const dice = this.pools.stamina;
    this.encumbrance = {};
    this.encumbrance.max = (dice.max * dice.faces).toNearest(0.05);
    this.encumbrance.value = this.parent.items.reduce((acc, item) => {
      return acc + item.system.weight.total;
    }, 0).toNearest(0.05);
  }

  /* -------------------------------------------------- */

  /** Prepare health values. */
  #prepareHealth() {
    // Set health maximum and clamp current health.
    const levels = this.parent.appliedConditionLevel("injured");
    const injury = 1 - levels / artichron.config.STATUS_CONDITIONS.injured.levels;
    const total = this.pools.health.max * this.pools.health.faces;

    let max = Math.ceil(total * injury);
    if ((levels > 0) && (max === total)) max = Math.clamp(max, 1, total - 1);

    this.health.max = max;
    this.health.value = Math.clamp(this.health.value, 0, this.health.max);
    this.health.pct = Math.round(this.health.value / this.health.max * 100);
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get BONUS_FIELDS() {
    const bonus = super.BONUS_FIELDS;

    // Pools
    for (const k of ["health", "mana", "stamina"]) {
      bonus.add(`system.pools.${k}.max`);
      bonus.add(`system.pools.${k}.faces`);
    }

    // Skills
    for (const k of Object.keys(artichron.config.SKILLS)) {
      bonus.add(`system.skills.${k}.number`);
      bonus.add(`system.skills.${k}.bonus`);
    }

    bonus.add("system.details.notes");

    return bonus;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Prompt for the creation of a progression of a given type. The chosen and configured
   * progression type will be applied to the actor.
   * @param {string} [type]                 The type of progression.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated actor.
   */
  async createProgression(type) {
    if (this.progression.points.available < 1) {
      ui.notifications.warn("ARTICHRON.ProgressionDialog.WarningNoPoints", { localize: true });
      return null;
    }

    const types = ProgressionData.TYPES;
    if (!types[type]) {
      type = await foundry.applications.api.DialogV2.prompt({
        content: new foundry.data.fields.StringField({
          choices: Object.entries(types).reduce((acc, [k, v]) => {
            acc[k] = k;
            return acc;
          }, {}),
          required: true,
          label: "ARTICHRON.ProgressionDialog.TypeLabel",
          hint: "ARTICHRON.ProgressionDialog.TypeHint",
        }).toFormGroup({ localize: true }, { name: "type" }).outerHTML,
        ok: { callback: (event, button) => button.form.elements.type.value },
        window: {
          title: game.i18n.format("ARTICHRON.ProgressionDialog.Title", { name: this.parent.name }),
          icon: "fa-solid fa-arrow-trend-up",
        },
        position: { width: 400 },
        modal: true,
      });
      if (!type) return null;
    }

    return types[type].toPrompt(this.parent);
  }

  /* -------------------------------------------------- */

  /**
   * Update a progression on this actor.
   * @param {string} id                     The id of the progression to update.
   * @param {object} [changes]              The change to apply to the progression.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated actor.
   */
  async updateProgression(id, changes = {}) {
    throw new Error("Updating a progression is not currently supported!");
  }

  /* -------------------------------------------------- */

  /**
   * Fully restore any resources.
   * @returns {Promise<ActorArtichron>}
   */
  async recover() {
    const update = {};
    update["system.health.value"] = this.health.max;

    // Pools.
    for (const k of ["health", "stamina", "mana"]) update[`system.pools.${k}.spent`] = 0;

    return this.parent.update(update);
  }

  /* -------------------------------------------------- */

  /**
   * Roll one or more dice from a pool.
   * @param {TYPES.PoolRollConfiguration} [config]        Roll configuration.
   * @param {TYPES.RollDialogConfiguration} [dialog]      Dialog configuration.
   * @param {TYPES.RollMessageConfiguration} [message]    Chat message configuration.
   * @returns {Promise<RollArtichron|null>}               A promise that resolves to the created roll.
   */
  async rollPool(config = {}, dialog = {}, message = {}) {
    config = foundry.utils.mergeObject({
      pool: "health",
      amount: 1,
    }, config);

    const pool = this.pools[config.pool];
    if (pool.value < config.amount) {
      ui.notifications.warn("ARTICHRON.ROLL.Pool.Warning.NotEnoughPoolDice", {
        format: { name: this.parent.name, type: game.i18n.localize(`ARTICHRON.Pools.${config.pool.capitalize()}`) },
      });
      return null;
    }

    const update = {};
    const actor = this.parent;

    if ((dialog.configure !== false) && !config.event?.shiftKey) {
      dialog = foundry.utils.mergeObject({
        content: new foundry.data.fields.NumberField({
          label: "ARTICHRON.ROLL.Pool.AmountLabel",
          hint: "ARTICHRON.ROLL.Pool.AmountHint",
          min: 1,
          max: pool.value,
          step: 1,
          nullable: false,
        }).toFormGroup({ localize: true }, { value: config.amount, name: "amount" }).outerHTML,
        window: {
          title: game.i18n.format("ARTICHRON.ROLL.Pool.Title", {
            type: game.i18n.localize(`ARTICHRON.Pools.${config.pool.capitalize()}`),
          }),
        },
        position: {
          width: 400,
        },
        ok: {
          label: "ARTICHRON.ROLL.Pool.Button",
          callback: (event, button, html) => button.form.elements.amount.value,
        },
        modal: true,
      }, dialog, { insertKeys: false });
      const configuration = await artichron.applications.api.Dialog.prompt(dialog);
      if (!configuration) return null;
      config.amount = configuration.amount;
    }

    const roll = await foundry.dice.Roll.create("(@amount)d@faces", { amount: config.amount, faces: pool.faces }).evaluate();
    update[`system.pools.${config.pool}.spent`] = pool.spent + parseInt(config.amount);

    message = foundry.utils.mergeObject({
      create: true,
      messageData: {
        speaker: ChatMessage.implementation.getSpeaker({ actor: actor }),
        flavor: game.i18n.format("ARTICHRON.ROLL.Pool.Flavor", {
          type: game.i18n.localize(`ARTICHRON.Pools.${config.pool.capitalize()}`),
        }),
        "flags.artichron.roll.type": config.pool,
      },
    }, message, { insertKeys: false });

    if (message.create) await roll.toMessage(message.messageData);

    await actor.update(update);
    return roll;
  }

  /* -------------------------------------------------- */

  /**
   * Roll two skills together.
   * @param {TYPES.SkillRollConfiguration} [config]       Roll configuration.
   * @param {TYPES.RollDialogConfiguration} [dialog]      Dialog configuration.
   * @param {TYPES.RollMessageConfiguration} [message]    Chat message configuration.
   * @returns {Promise<RollArtichron|null>}               A promise that resolves to the created roll.
   */
  async rollSkill(config = {}, dialog = {}, message = {}) {
    const skills = Object.entries(this.skills).map(([k, v], i) => {
      return {
        value: k,
        checked: (k === config.base) || (!i && !config.base),
        checked2: (k === config.second) || (!i && !config.second),
        img: artichron.config.SKILLS[k].img,
        label: artichron.config.SKILLS[k].label,
      };
    });

    const skillIds = Object.keys(artichron.config.SKILLS);
    dialog.configure = (!config.event?.shiftKey && (dialog.configure !== false)) || !(skillIds.includes(config.base) && skillIds.includes(config.second));

    if (dialog.configure) {
      const dialogData = foundry.utils.mergeObject({
        content: await renderTemplate("systems/artichron/templates/actor/skill-dialog.hbs", { skills: skills }),
        modal: true,
        window: {
          title: game.i18n.format("ARTICHRON.SkillsDialog.Title", { name: this.parent.name }),
          icon: "fa-solid fa-hand-fist",
        },
        position: { width: 400, height: "auto" },
        ok: { callback: (event, button) => new FormDataExtended(button.form).object },
        classes: ["skills"],
      }, dialog, { insertKeys: false });

      const configuration = await artichron.applications.api.Dialog.prompt(dialogData);
      if (!configuration) return null;
      foundry.utils.mergeObject(config, configuration);
    }

    const formula = [
      `(@skills.${config.base}.number + @skills.${config.second}.number)d6cs=6`,
      "+",
      `(@skills.${config.base}.bonus + @skills.${config.second}.bonus)`,
    ].join(" ");
    const rollData = this.parent.getRollData();
    const roll = await foundry.dice.Roll.create(formula, rollData, { skills: [config.base, config.second] }).evaluate();

    message = foundry.utils.mergeObject({
      create: true,
      messageData: {
        flavor: game.i18n.format("ARTICHRON.SkillsDialog.Flavor", {
          skills: Array.from(new Set([config.base, config.second]).map(skl => {
            return artichron.config.SKILLS[skl].label;
          })).sort((a, b) => a.localeCompare(b)).join(", "),
        }),
        speaker: ChatMessage.implementation.getSpeaker({ actor: this.parent }),
      },
    }, message);

    if (message.create) await roll.toMessage(message.messageData);
    return roll;
  }
}
