import {ActorSystemModel} from "./system-model.mjs";

const {ArrayField, DocumentUUIDField, HTMLField, SchemaField} = foundry.data.fields;

export default class MonsterData extends ActorSystemModel {
  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();
    schema.loot = new ArrayField(new DocumentUUIDField({type: "Item", embedded: false}), {
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

  /** @override */
  async _preUpdate(update, options, user) {
    return super._preUpdate(update, options, user);
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The items that this monster will drop when killed.
   * @type {Set<ItemArtichron>}
   */
  get lootDrops() {
    const loot = new Set();
    for (const uuid of this.loot) {
      const item = fromUuidSync(uuid);
      if (item) loot.add(item);
    }
    return loot;
  }
}
