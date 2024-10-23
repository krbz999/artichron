import CreatureData from "./creature-data.mjs";

const {ArrayField, DocumentUUIDField, HTMLField, NumberField, SchemaField} = foundry.data.fields;

export default class MonsterData extends CreatureData {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ActorSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "monster"
  });

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();

    schema.loot = new ArrayField(new SchemaField({
      uuid: new DocumentUUIDField({type: "Item", embedded: false}),
      quantity: new NumberField({min: 1, integer: true, initial: 1, nullable: false})
    }));

    schema.danger = new SchemaField({
      pool: new SchemaField({
        spent: new NumberField({min: 0, integer: true, nullable: false, initial: 0}),
        max: new NumberField({min: 0, integer: true, nullable: false, initial: 1})
      }),
      value: new NumberField({min: 1, integer: true, initial: 1, nullable: false})
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
    this.health.max = 40;
  }

  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Set health maximum and clamp current health.
    this.health.max = this.health.max + this.danger.value * 10;
    const injury = 1 - this.parent.appliedConditionLevel("injured") / 100;
    this.health.max = Math.ceil(this.health.max * injury);
    this.health.value = Math.clamp(this.health.value, 0, this.health.max);
    this.health.pct = Math.round(this.health.value / this.health.max * 100);

    const d = this.danger.pool;
    d.value = Math.max(d.max - d.spent);
    d.pct = Math.round(d.value / d.max * 100);
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    const bonus = super.BONUS_FIELDS;

    bonus.add("system.biography.value");
    bonus.add("system.danger.value");

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
   * Grant the loot of this monster to the party.
   * @param {ActorArtichron} [party]          The party to grant the items to.
   * @returns {Promise<ItemArtichron[]>}      A promise that resolves to the created items.
   */
  async grantLootDrops(party = null) {
    party ??= game.settings.get("artichron", "primaryParty").actor;
    if (party?.type !== "party") throw new Error("No primary party has been assigned!");

    const promises = this.lootDrops.map(async ({item, quantity}) => {
      item = await fromUuid(item.uuid);
      if (!item) return null;
      item = game.items.fromCompendium(item);
      foundry.utils.setProperty(item, "system.quantity.value", quantity);
      return item;
    });
    const itemData = (await Promise.all(promises)).filter(_ => _);
    const created = await party.createEmbeddedDocuments("Item", itemData);

    ChatMessage.implementation.create({
      content: await renderTemplate("systems/artichron/templates/chat/loot-grant.hbs", {
        actor: this.parent,
        items: created.map(item => ({link: item.link, qty: item.system.quantity?.value ?? 1}))
      })
    });

    await this.parent.update({"system.loot": []});

    return created;
  }

  /* -------------------------------------------------- */

  /**
   * Fully restore any resources.
   * @returns {Promise<ActorArtichron>}
   */
  async recover() {
    const update = {};
    update["system.health.value"] = this.health.max;
    update["system.danger.pool.spent"] = 0;
    return this.parent.update(update);
  }
}
