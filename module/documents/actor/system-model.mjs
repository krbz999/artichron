import {PoolDiceModel} from "../fields/die.mjs";
import {LocalIdField} from "../fields/local-id.mjs";
import {FormulaField} from "../fields/formula-field.mjs";
import {ResistanceField} from "../fields/resistance-field.mjs";
import {SkillField} from "../fields/skill-field.mjs";

const {SchemaField, NumberField, SetField, EmbeddedDataField, StringField} = foundry.data.fields;

export class ActorSystemModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      health: new SchemaField({
        value: new NumberField({min: 0, integer: true}),
        max: new NumberField({initial: null})
      }),
      pools: new SchemaField({
        health: new EmbeddedDataField(PoolDiceModel),
        stamina: new EmbeddedDataField(PoolDiceModel),
        mana: new EmbeddedDataField(PoolDiceModel)
      }),
      equipped: new SchemaField({
        arsenal: new SchemaField({
          primary: new LocalIdField(foundry.documents.BaseItem),
          secondary: new LocalIdField(foundry.documents.BaseItem)
        }),
        armor: new SchemaField(Object.keys(CONFIG.SYSTEM.EQUIPMENT_TYPES).reduce((acc, key) => {
          acc[key] = new LocalIdField(foundry.documents.BaseItem);
          return acc;
        }, {})),
        ammo: new SetField(new LocalIdField(foundry.documents.BaseItem, {idOnly: true})),
        favorites: new SetField(new LocalIdField(foundry.documents.BaseItem, {idOnly: true}))
      }),
      resistances: new ResistanceField(),
      defenses: new SchemaField({
        armor: new SchemaField({
          value: new FormulaField({required: true})
        })
      }),
      skills: new SchemaField(Object.keys(CONFIG.SYSTEM.SKILLS).reduce((acc, skill) => {
        acc[skill] = new SkillField(skill);
        return acc;
      }, {})),
      pips: new SchemaField({
        value: new NumberField({
          min: 0,
          integer: true,
          label: "ARTICHRON.ActorProperty.ActionPoints.Value",
          hint: "ARTICHRON.ActorProperty.ActionPoints.ValueHint"
        }),
        turn: new NumberField({
          min: 0,
          integer: true,
          initial: 2,
          label: "ARTICHRON.ActorProperty.ActionPoints.Turn",
          hint: "ARTICHRON.ActorProperty.ActionPoints.TurnHint"
        })
      }),
      traits: new SchemaField({
        pool: new StringField({required: true, initial: "health", choices: ["health", "stamina", "mana"]}) // TODO
      })
    };
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Retrieve an object for roll data.
   * @returns {object}
   */
  getRollData() {
    return {...this};
  }

  /* -------------------------------------------------- */
  /*   Life-cycle methods                               */
  /* -------------------------------------------------- */

  /**
   * Modify the update to the system data model.
   * @param {object} update       The update to any system-specific properties.
   * @param {object} options      The update options.
   * @param {User} user           The user performing the update.
   */
  async _preUpdate(update, options, user) {
    const allowed = await super._preUpdate(update, options, user);
    if (allowed === false) return false;
    const health = update.system?.health ?? {};
    if ("value" in health) {
      health.value = Math.clamp(health.value, 0, this.health.max);
      options.health = {o: this.health.value};
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (options.health) {
      options.health.n = this.health.value;
      options.health.delta = options.health.n - options.health.o;
    }
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
    const rollData = this.parent.getRollData();
    this._preparePools(rollData);
    this._prepareEquipped();
    this._prepareEncumbrance();
    this._prepareArmor(rollData);
    this._prepareResistances(rollData);
    this._prepareEmbeddedData(rollData);
  }

  /* -------------------------------------------------- */

  /** Prepare pools. */
  _preparePools(rollData) {
    Object.entries(this.pools).forEach(([k, v]) => v.prepareDerivedData(rollData));
  }

  /* -------------------------------------------------- */

  /** Prepare equipped items. */
  _prepareEquipped() {
    const {arsenal, armor} = this.equipped;

    if (arsenal.primary?.isTwoHanded || arsenal.secondary?.isTwoHanded) arsenal.secondary = null;

    for (const [key, item] of Object.entries(armor)) {
      if (!item) continue;
      armor[key] = ((item.type === "armor") && (item.system.category.subtype === key)) ? item : null;
    }

    this.equipped.ammo = this.equipped.ammo.reduce((acc, id) => {
      const item = this.parent.items.get(id);
      if (item && item.isAmmo) acc.add(item);
      return acc;
    }, new Set());

    this.equipped.favorites = this.equipped.favorites.reduce((acc, id) => {
      const item = this.parent.items.get(id);
      if (item) acc.add(item);
      return acc;
    }, new Set());
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
  _prepareArmor(rollData) {
    const armor = this.defenses.armor;
    armor.value = Object.values({...this.parent.armor, ...this.parent.arsenal}).reduce((acc, item) => {
      let v = item?.system.armor?.value ?? 0;
      if (v) v = artichron.utils.simplifyBonus(v, item.getRollData());
      else v = 0;
      return acc + v;
    }, artichron.utils.simplifyBonus(armor.value, rollData));
  }

  /* -------------------------------------------------- */

  /** Prepare the value of actor resistances. */
  _prepareResistances(rollData) {
    const armors = Object.values(this.parent.armor).reduce((acc, w) => {
      if (w) acc.push([w, w.getRollData()]);
      return acc;
    }, []);

    for (const [k, v] of Object.entries(this.resistances)) {
      let total = artichron.utils.simplifyBonus(v.value, rollData);
      for (const [item, rollData] of armors) {
        total += artichron.utils.simplifyBonus(item.system.resistances[k].value, rollData);
      }
      v.value = total;
    }
  }

  /* -------------------------------------------------- */

  /** Prepare any embedded models. */
  _prepareEmbeddedData(rollData) {}

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  static get BONUS_FIELDS() {
    const s = new Set(["name", "img"]);
    const schema = this.schema.initial();
    for (const [k, v] of Object.entries(schema.pools)) {
      s.add(`system.pools.${k}.max`).add(`system.pools.${k}.faces`);
      for (const w of Object.keys(v.modifiers)) {
        s.add(`system.pools.${k}.modifiers.${w}`);
      }
    }
    s.add("system.defenses.armor.value");
    for (const k of Object.keys(schema.resistances)) s.add(`system.resistances.${k}.value`);
    for (const k of Object.keys(schema.skills)) s.add(`system.skills.${k}.value`);
    return s;
  }

  /* -------------------------------------------------- */

  /**
   * The currently equipped ammunition.
   * @type {Set<ItemArtichron>}
   */
  get ammo() {
    return this.equipped.ammo;
  }

  /* -------------------------------------------------- */

  /**
   * The currently equipped arsenal.
   * @type {{primary: ItemArtichron, secondary: ItemArtichron}}
   */
  get arsenal() {
    const items = this.equipped.arsenal;
    return {
      primary: items.primary ?? null,
      secondary: items.secondary ?? null
    };
  }

  /* -------------------------------------------------- */

  /**
   * The currently equipped armor set.
   * @type {object}
   */
  get armor() {
    const items = this.equipped.armor;
    return Object.keys(CONFIG.SYSTEM.EQUIPMENT_TYPES).reduce((acc, k) => {
      acc[k] = items[k] ?? null;
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

  /**
   * The items that this actor has favorited.
   * @type {Set<ItemArtichron>}
   */
  get favorites() {
    return this.equipped.favorites;
  }
}
