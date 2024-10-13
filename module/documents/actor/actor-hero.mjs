import CreatureData from "./creature-data.mjs";
import ProgressionData from "../fields/hero-progression.mjs";

const {ArrayField, HTMLField, NumberField, SchemaField, TypedSchemaField} = foundry.data.fields;

export default class HeroData extends CreatureData {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ActorSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "hero"
  });

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();

    const poolSchema = () => {
      return new SchemaField({
        spent: new NumberField({min: 0, integer: true, initial: 0}),
        max: new NumberField({min: 2, integer: true, initial: 2, nullable: false}),
        faces: new NumberField({min: 4, integer: true, initial: 4, nullable: false})
      });
    };

    schema.pools = new SchemaField({
      health: poolSchema(),
      stamina: poolSchema(),
      mana: poolSchema()
    });

    schema.skills = new SchemaField(Object.entries(CONFIG.SYSTEM.SKILLS).reduce((acc, [k, v]) => {
      acc[k] = new SchemaField({
        number: new NumberField({integer: true, min: 2, initial: 2, nullable: false}),
        bonus: new NumberField({integer: true, min: 0, initial: 0})
      });
      return acc;
    }, {}));

    schema.details = new SchemaField({
      notes: new HTMLField({required: true})
    });

    schema.progression = new SchemaField({
      points: new SchemaField({
        total: new NumberField({min: 0, integer: true, initial: 0, nullable: false}),
        spent: new ArrayField(new TypedSchemaField(ProgressionData.TYPES))
      })
    });

    return schema;
  }

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();

    // Set the available number of progression points.
    const spent = this.progression.points.spent.reduce((acc, p) => acc + p.value, 0);
    this.progression.points.available = this.progression.points.total - spent;

    const progression = CONFIG.SYSTEM.PROGRESSION_THRESHOLDS.toReversed().find(p => {
      return this.progression.points.total >= p.threshold;
    });
    this.progression.level = progression.level;
  }

  /* -------------------------------------------------- */

  /** @override */
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
    const injury = 1 - levels / CONFIG.SYSTEM.STATUS_CONDITIONS.injured.levels;
    const total = this.pools.health.max * this.pools.health.faces;

    let max = Math.ceil(total * injury);
    max = (levels === 1) ? Math.clamp(max, 1, total - 1) : max;

    this.health.max = max;
    this.health.value = Math.clamp(this.health.value, 0, this.health.max);
    this.health.pct = Math.round(this.health.value / this.health.max * 100);
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    const bonus = super.BONUS_FIELDS;

    // Pools
    for (const k of ["health", "mana", "stamina"]) {
      bonus.add(`system.pools.${k}.max`);
      bonus.add(`system.pools.${k}.faces`);
    }

    // Skills
    for (const k of Object.keys(CONFIG.SYSTEM.SKILLS)) {
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
      ui.notifications.warn("ARTICHRON.ProgressionDialog.WarningNoPoints", {localize: true});
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
          hint: "ARTICHRON.ProgressionDialog.TypeHint"
        }).toFormGroup({localize: true}, {name: "type"}).outerHTML,
        ok: {callback: (event, button) => button.form.elements.type.value},
        rejectClose: false,
        window: {
          title: game.i18n.format("ARTICHRON.ProgressionDialog.Title", {name: this.parent.name}),
          icon: "fa-solid fa-arrow-trend-up"
        },
        position: {width: 400},
        modal: true
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
   * @param {string} type               The type of pool dice to roll (health, stamina, mana).
   * @param {number} amount             The amount of dice to roll.
   * @param {boolean} message           Whether to create a chat message.
   * @param {PointerEvent} event        An associated click event.
   * @returns {Promise<Roll|null>}      The created Roll instance.
   */
  async rollPool(type, {amount = 1, message = true, event} = {}) {
    // TODO: redo this whole thing, it should take three parameters for usage, dialog, message.
    if (!(type in this.pools)) return null;
    const pool = this.pools[type];
    if (pool.value < amount) {
      ui.notifications.warn(game.i18n.format("ARTICHRON.ROLL.Pool.Warning.NotEnoughPoolDice", {
        name: this.parent.name,
        type: game.i18n.localize(`ARTICHRON.Pools.${type.capitalize()}`)
      }));
      return null;
    }

    const update = {};
    const actor = this.parent;

    if (!event.shiftKey) amount = await foundry.applications.api.DialogV2.prompt({
      content: new foundry.data.fields.NumberField({
        label: "ARTICHRON.ROLL.Pool.AmountLabel",
        hint: "ARTICHRON.ROLL.Pool.AmountHint",
        min: 1,
        max: pool.value,
        step: 1,
        nullable: false
      }).toFormGroup({localize: true}, {value: amount, name: "amount"}).outerHTML,
      window: {
        title: game.i18n.format("ARTICHRON.ROLL.Pool.Title", {
          type: game.i18n.localize(`ARTICHRON.Pools.${type.capitalize()}`)
        })
      },
      position: {
        width: 400
      },
      ok: {
        label: "ARTICHRON.ROLL.Pool.Button",
        callback: (event, button, html) => button.form.elements.amount.valueAsNumber
      },
      modal: true,
      rejectClose: false
    });
    if (!amount) return null;

    const roll = await foundry.dice.Roll.create("(@amount)d@faces", {amount, faces: pool.faces}).evaluate();
    update[`system.pools.${type}.spent`] = pool.spent + amount;
    if (message) {
      await roll.toMessage({
        speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
        flavor: game.i18n.format("ARTICHRON.ROLL.Pool.Flavor", {
          type: game.i18n.localize(`ARTICHRON.Pools.${type.capitalize()}`)
        }),
        "flags.artichron.roll.type": type
      });
    }

    await actor.update(update);
    return roll;
  }

  /* -------------------------------------------------- */

  /**
   * Roll two skills together.
   * @param {object} [config]               Configuration object.
   * @param {string} [config.base]          The first of the skills used.
   * @param {string} [config.second]        The second of the skills used.
   * @returns {Promise<RollArtichron>}      A promise that resolves to the created roll.
   */
  async rollSkill({base, second} = {}) {
    const skills = Object.entries(this.skills).map(([k, v], i) => {
      return {
        value: k,
        checked: (k === base) || (!i && !base),
        checked2: (k === second) || (!i && !second),
        img: CONFIG.SYSTEM.SKILLS[k].img,
        label: CONFIG.SYSTEM.SKILLS[k].label
      };
    });

    if (!base || !second || !(new Set([base, second]).isSubset(new Set(Object.keys(CONFIG.SYSTEM.SKILLS))))) {
      const prompt = await foundry.applications.api.DialogV2.prompt({
        content: await renderTemplate("systems/artichron/templates/actor/skill-dialog.hbs", {skills: skills}),
        rejectClose: false,
        modal: true,
        window: {
          title: game.i18n.format("ARTICHRON.SkillsDialog.Title", {name: this.parent.name}),
          icon: "fa-solid fa-hand-fist"
        },
        position: {width: 400, height: "auto"},
        ok: {callback: (event, button) => new FormDataExtended(button.form).object},
        classes: ["artichron", "skills"]
      });
      if (!prompt) return null;
      base = prompt.base;
      second = prompt.second;
    }

    const formula = [
      `(@skills.${base}.number + @skills.${second}.number)d6cs=6`,
      "+",
      `(@skills.${base}.bonus + @skills.${second}.bonus)`
    ].join(" ");
    const rollData = this.parent.getRollData();
    const roll = await foundry.dice.Roll.create(formula, rollData, {skills: [base, second]}).evaluate();
    await roll.toMessage({
      flavor: game.i18n.format("ARTICHRON.SkillsDialog.Flavor", {
        skills: Array.from(new Set([base, second]).map(skl => {
          return CONFIG.SYSTEM.SKILLS[skl].label;
        })).sort((a, b) => a.localeCompare(b)).join(", ")
      }),
      speaker: ChatMessage.implementation.getSpeaker({actor: this.parent})
    });
    return roll;
  }
}
