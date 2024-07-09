import {SkillField} from "../fields/skill-field.mjs";
import ActorSystemModel from "./system-model.mjs";

const {NumberField, SchemaField, SetField, StringField} = foundry.data.fields;

export default class HeroData extends ActorSystemModel {
  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();

    schema.pools = new SchemaField({
      health: new SchemaField({
        spent: new NumberField({
          min: 0,
          integer: true,
          initial: 0,
          label: "ARTICHRON.ActorProperty.Pools.Health.Spent",
          hint: "ARTICHRON.ActorProperty.Pools.Health.SpentHint"
        }),
        max: new NumberField({
          min: 3,
          integer: true,
          initial: 3,
          label: "ARTICHRON.ActorProperty.Pools.Health.Max",
          hint: "ARTICHRON.ActorProperty.Pools.Health.MaxHint"
        }),
        faces: new NumberField({
          min: 4,
          integer: true,
          initial: 4,
          label: "ARTICHRON.ActorProperty.Pools.Health.Faces",
          hint: "ARTICHRON.ActorProperty.Pools.Health.FacesHint"
        })
      }),
      stamina: new SchemaField({
        spent: new NumberField({
          min: 0,
          integer: true,
          initial: 0,
          label: "ARTICHRON.ActorProperty.Pools.Stamina.Spent",
          hint: "ARTICHRON.ActorProperty.Pools.Stamina.SpentHint"
        }),
        max: new NumberField({
          min: 3,
          integer: true,
          initial: 3,
          label: "ARTICHRON.ActorProperty.Pools.Stamina.Max",
          hint: "ARTICHRON.ActorProperty.Pools.Stamina.MaxHint"
        }),
        faces: new NumberField({
          min: 4,
          integer: true,
          initial: 4,
          label: "ARTICHRON.ActorProperty.Pools.Stamina.Faces",
          hint: "ARTICHRON.ActorProperty.Pools.Stamina.FacesHint"
        })
      }),
      mana: new SchemaField({
        spent: new NumberField({
          min: 0,
          integer: true,
          initial: 0,
          label: "ARTICHRON.ActorProperty.Pools.Mana.Spent",
          hint: "ARTICHRON.ActorProperty.Pools.Mana.SpentHint"
        }),
        max: new NumberField({
          min: 3,
          integer: true,
          initial: 3,
          label: "ARTICHRON.ActorProperty.Pools.Mana.Max",
          hint: "ARTICHRON.ActorProperty.Pools.Mana.MaxHint"
        }),
        faces: new NumberField({
          min: 4,
          integer: true,
          initial: 4,
          label: "ARTICHRON.ActorProperty.Pools.Mana.Faces",
          hint: "ARTICHRON.ActorProperty.Pools.Mana.FacesHint"
        })
      })
    });

    schema.traits = new SchemaField({
      pool: new StringField({required: true, initial: "health", choices: ["health", "stamina", "mana"]}) // TODO
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

    schema.skills = new SchemaField(Object.keys(CONFIG.SYSTEM.SKILLS).reduce((acc, skill) => {
      acc[skill] = new SkillField(skill);
      return acc;
    }, {}));

    return schema;
  }

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();

    // Set 'faces' of each pool.
    for (const [k, v] of Object.entries(this.pools)) {
      v.faces = (k === this.traits.pool) ? 6 : 4;
    }

    // Set health maximum and clamp current health.
    const injury = 1 - this.parent.appliedConditionLevel("injured") / 100;
    this.health.max = Math.ceil(10 * this.pools.health.max * this.pools.health.faces * injury);
    this.health.value = Math.clamp(this.health.value, 0, this.health.max);
    this.health.pct = Math.round(this.health.value / this.health.max * 100);
  }

  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    this._preparePools();
    this._prepareEncumbrance();
    this._prepareArmor();
    this._prepareResistances();
  }

  /* -------------------------------------------------- */

  /** Prepare pools. */
  _preparePools() {
    for (const k of ["health", "stamina", "mana"]) {
      const value = this.pools[k].max - this.pools[k].spent;
      this.pools[k].value = Math.max(0, value);
    }
  }

  /* -------------------------------------------------- */

  /** Prepare current and max encumbrance. */
  _prepareEncumbrance() {
    const dice = this.pools.stamina;
    this.encumbrance = {};
    this.encumbrance.max = dice.max * dice.faces;
    this.encumbrance.value = this.parent.items.reduce((acc, item) => {
      return acc + item.system.weight.total;
    }, 0);
  }

  /* -------------------------------------------------- */

  /** Prepare armor value. */
  _prepareArmor() {
    const armor = this.defenses.armor;
    armor.value = Object.values({...this.parent.armor, ...this.parent.arsenal}).reduce((acc, item) => {
      return acc + (["armor", "shield"].includes(item?.type) ? item.system.armor.value : 0);
    }, armor.value);
  }

  /* -------------------------------------------------- */

  /** Prepare the value of actor resistances. */
  _prepareResistances() {
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
    if (primary?.type !== "weapon") primary = null;
    let secondary = this.parent.items.get(items.secondary) ?? null;
    if ((secondary?.type !== "weapon") || (primary?.isTwoHanded || secondary.isTwoHanded)) secondary = null;
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
