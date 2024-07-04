import {ActorSystemModel} from "./system-model.mjs";

const {ArrayField, DocumentUUIDField, HTMLField, NumberField, SchemaField} = foundry.data.fields;

export default class MonsterData extends ActorSystemModel {
  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();

    schema.loot = new ArrayField(new SchemaField({
      uuid: new DocumentUUIDField({type: "Item", embedded: false}),
      quantity: new NumberField({min: 1, integer: true, initial: 1})
    }), {
      label: "ARTICHRON.ActorProperty.Loot",
      hint: "ARTICHRON.ActorProperty.LootHint"
    });

    schema.biography = new SchemaField({
      value: new HTMLField({required: true})
    });

    return schema;
  }

  /* -------------------------------------------------- */
  /*   Life-cycle events                                */
  /* -------------------------------------------------- */

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();

    // Set health maximum and clamp current health.
    const injury = 1 - this.parent.appliedConditionLevel("injured") / 100;
    this.health.max = Math.ceil(this.health.max * injury);
    this.health.value = Math.clamp(this.health.value, 0, this.health.max);
    this.health.pct = Math.round(this.health.value / this.health.max * 100);
  }

  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    const rollData = this.parent.getRollData();

    // Set armor value.
    const armor = this.defenses.armor;
    armor.value = artichron.utils.simplifyBonus(armor.value, rollData);

    // Set resistances.
    for (const [k, v] of Object.entries(this.resistances)) {
      v.value = artichron.utils.simplifyBonus(v.value, rollData);
    }
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    const bonus = super.BONUS_FIELDS;

    bonus.add("system.biography.value");

    return bonus;
  }

  /**
   * The items that this monster will drop when killed.
   * @type {object[]}     Objects with an index entry and quantity.
   */
  get lootDrops() {
    const items = new Map();
    for (const {uuid, quantity} of this.loot) {
      try {
        const item = fromUuidSync(uuid);
        if (item) {
          let q = items.get(uuid)?.quantity;
          q = q ? (q + quantity) : quantity;
          items.set(uuid, {item, quantity: q});
        }
      } catch (err) {
        console.warn(err);
        continue;
      }
    }
    return Array.from(items.values());
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Add a new loot item.
   * @param {string} uuid           Uuid of the item.
   * @param {number} [quantity]     The quantity of the item.
   * @returns {Promise<ActorArtichron>}
   */
  async addLootDrop(uuid, quantity = 1) {
    const loot = this.lootDrops.map(({item, quantity}) => ({uuid: item.uuid, quantity}));
    const item = loot.find(l => l.uuid === uuid);
    if (item) item.quantity += quantity;
    else loot.push({uuid, quantity});
    await this.parent.update({"system.loot": loot});
    return this.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Remove a loot item.
   * @param {string} uuid     Uuid of the item.
   * @returns {Promise<ActorArtichron>}
   */
  async removeLootDrop(uuid) {
    const loot = this.lootDrops.map(({item, quantity}) => ({uuid: item.uuid, quantity}));
    const item = loot.findSplice(l => l.uuid === uuid);
    if (item) await this.parent.update({"system.loot": loot});
    return this.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Adjust a loot item's quantity.
   * @param {string} uuid         Uuid of the item.
   * @param {number} quantity     The quantity to add or remove. Reducing to 0 will remove the stack.
   * @returns {Promise<ActorArtichron>}
   */
  async adjustLootDrop(uuid, quantity) {
    const removeAll = !Number.isInteger(quantity);
    const loot = this.lootDrops.map(({item, quantity}) => ({uuid: item.uuid, quantity}));
    const item = loot.findSplice(l => l.uuid === uuid);
    if (item && !removeAll) {
      item.quantity += quantity;
      if (item.quantity > 0) loot.push({uuid, quantity: item.quantity});
    }
    await this.parent.update({"system.loot": loot});
    return this.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Fully restore any resources.
   * @returns {Promise<ActorArtichron>}
   */
  async recover() {
    const update = {};
    update["system.health.value"] = this.health.max;
    return this.parent.update(update);
  }
}
