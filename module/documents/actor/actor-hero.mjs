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
        max: new NumberField({min: 3, integer: true, initial: 3}),
        faces: new NumberField({min: 4, integer: true, initial: 4})
      }),
      stamina: new SchemaField({
        spent: new NumberField({min: 0, integer: true, initial: 0}),
        max: new NumberField({min: 3, integer: true, initial: 3}),
        faces: new NumberField({min: 4, integer: true, initial: 4})
      }),
      mana: new SchemaField({
        spent: new NumberField({min: 0, integer: true, initial: 0}),
        max: new NumberField({min: 3, integer: true, initial: 3}),
        faces: new NumberField({min: 4, integer: true, initial: 4})
      })
    });

    schema.skills = new SchemaField(Object.entries(CONFIG.SYSTEM.SKILLS).reduce((acc, [k, v]) => {
      acc[k] = new SchemaField({
        value: new NumberField({
          integer: true,
          min: 0,
          initial: 0,
          label: v.label
        })
      });
      return acc;
    }, {}));

    schema.resources = new SchemaField({
      currency: new NumberField({min: 0, step: 1}),
      pools: new NumberField({min: 0, step: 1}),
      skills: new NumberField({min: 0, step: 1})
    });

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
      bonus.add(`system.skills.${k}.value`);
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
}
