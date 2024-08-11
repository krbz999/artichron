import ActorSystemModel from "./system-model.mjs";
import EquipmentTemplateMixin from "./templates/equipment-data.mjs";

const {HTMLField, NumberField, SchemaField} = foundry.data.fields;

export default class HeroData extends ActorSystemModel.mixin(EquipmentTemplateMixin) {
  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();

    schema.pools = new SchemaField({
      health: new SchemaField({
        spent: new NumberField({min: 0, integer: true, initial: 0}),
        max: new NumberField({min: 2, integer: true, initial: 2}),
        faces: new NumberField({min: 4, integer: true, initial: 4})
      }),
      stamina: new SchemaField({
        spent: new NumberField({min: 0, integer: true, initial: 0}),
        max: new NumberField({min: 2, integer: true, initial: 2}),
        faces: new NumberField({min: 4, integer: true, initial: 4})
      }),
      mana: new SchemaField({
        spent: new NumberField({min: 0, integer: true, initial: 0}),
        max: new NumberField({min: 2, integer: true, initial: 2}),
        faces: new NumberField({min: 4, integer: true, initial: 4})
      })
    });

    schema.skills = new SchemaField(Object.entries(CONFIG.SYSTEM.SKILLS).reduce((acc, [k, v]) => {
      acc[k] = new SchemaField({
        number: new NumberField({integer: true, min: 2, initial: 2}),
        bonus: new NumberField({integer: true, min: 0, initial: 0})
      });
      return acc;
    }, {}));

    schema.details = new SchemaField({
      notes: new HTMLField({required: true})
    });

    return schema;
  }

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();

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

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.#preparePools();
    this.#prepareEncumbrance();
  }

  /* -------------------------------------------------- */

  /** Prepare pools. */
  #preparePools() {
    for (const k of ["health", "stamina", "mana"]) {
      const value = this.pools[k].max - this.pools[k].spent;
      this.pools[k].value = Math.max(0, value);
    }
  }

  /* -------------------------------------------------- */

  /** Prepare current and max encumbrance. */
  #prepareEncumbrance() {
    const dice = this.pools.stamina;
    this.encumbrance = {};
    this.encumbrance.max = dice.max * dice.faces;
    this.encumbrance.value = this.parent.items.reduce((acc, item) => {
      return acc + item.system.weight.total;
    }, 0);
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
    const roll = await Roll.create(formula, rollData, {skills: [base, second]}).evaluate();
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
