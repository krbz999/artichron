import {ActorSystemModel} from "./system-model.mjs";

const {HTMLField, SetField, SchemaField, StringField} = foundry.data.fields;

export default class MonsterData extends ActorSystemModel {
  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();
    schema.loot = new SetField(new StringField(), {
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
    for (const id of this.loot) {
      const item = this.parent.items.get(id);
      if (item) loot.add(item);
    }
    return loot;
  }
}
