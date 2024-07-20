import ActorSystemModel from "./system-model.mjs";

const {HTMLField, NumberField, SchemaField, StringField} = foundry.data.fields;

export default class HeroData extends ActorSystemModel {
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

    schema.equipped = new SchemaField({
      arsenal: new SchemaField({
        primary: new StringField({required: true}),
        secondary: new StringField({required: true})
      }),
      armor: new SchemaField(Object.keys(CONFIG.SYSTEM.EQUIPMENT_TYPES).reduce((acc, key) => {
        acc[key] = new StringField({required: true});
        return acc;
      }, {}))
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

    schema.details = new SchemaField({
      notes: new HTMLField({
        required: true,
        label: "ARTICHRON.ActorProperty.Details.Notes"
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
    this.#preparePools();
    this.#prepareEncumbrance();
    this.#prepareArmor();
    this.#prepareResistances();
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

  /** Prepare armor value. */
  #prepareArmor() {
    const armor = this.defenses.armor;
    armor.value = Object.values({...this.parent.armor, ...this.parent.arsenal}).reduce((acc, item) => {
      return acc + (["armor", "shield"].includes(item?.type) ? item.system.armor.value : 0);
    }, armor.value);
  }

  /* -------------------------------------------------- */

  /** Prepare the value of actor resistances. */
  #prepareResistances() {
    for (const item of Object.values(this.parent.armor)) {
      if (!item) continue;
      for (const [k, v] of Object.entries(item.system.resistances)) {
        this.resistances[k].value += v.value;
      }
    }
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

  /**
   * The currently equipped arsenal.
   * @type {{primary: ItemArtichron, secondary: ItemArtichron}}
   */
  get arsenal() {
    const items = this.equipped.arsenal;
    let primary = this.parent.items.get(items.primary) ?? null;
    if (!primary?.isArsenal) primary = null;
    let secondary = this.parent.items.get(items.secondary) ?? null;
    if (!secondary?.isArsenal || (primary?.isTwoHanded || secondary.isTwoHanded)) secondary = null;
    return {primary, secondary};
  }

  /* -------------------------------------------------- */

  /**
   * The currently equipped armor set.
   * @type {object}
   */
  get armor() {
    const items = this.equipped.armor;
    return Object.keys(CONFIG.SYSTEM.EQUIPMENT_TYPES).reduce((acc, k) => {
      const item = this.parent.items.get(items[k]) ?? null;
      acc[k] = ((item?.type === "armor") && (item.system.category.subtype === k)) ? item : null;
      return acc;
    }, {});
  }

  /* -------------------------------------------------- */

  /**
   * Does this actor have a shield equipped?
   * @type {boolean}
   */
  get hasShield() {
    return (this.equipped.arsenal.primary?.type === "shield")
      || (this.equipped.arsenal.secondary?.type === "shield");
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
