import ActorSheetArtichron from "./actor-sheet-base.mjs";

export default class MonsterSheet extends ActorSheetArtichron {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["monster"],
    position: {
      width: 450
    },
    actions: {}
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/shared/sheet-header.hbs"},
    health: {template: "systems/artichron/templates/actor/monster-health.hbs"},
    tabs: {template: "systems/artichron/templates/shared/tabs.hbs"},
    attributes: {
      template: "systems/artichron/templates/actor/monster-attributes.hbs",
      templates: ["systems/artichron/templates/actor/monster-defenses.hbs"]
    },
    items: {template: "systems/artichron/templates/actor/monster-items.hbs"},
    about: {template: "systems/artichron/templates/actor/monster-about.hbs"},
    effects: {template: "systems/artichron/templates/shared/effects.hbs"}
  };

  /* -------------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "attributes",
    items: "inventory"
  };

  /* -------------------------------------------------- */

  /** @override */
  static TABS = {
    attributes: {id: "attributes", group: "primary", label: "ARTICHRON.SheetTab.Attributes"},
    items: {id: "items", group: "primary", label: "ARTICHRON.SheetTab.Items"},
    about: {id: "about", group: "primary", label: "ARTICHRON.SheetTab.About"},
    effects: {id: "effects", group: "primary", label: "ARTICHRON.SheetTab.Effects"}
  };

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const doc = this.document;
    const src = this.document.toObject();
    const rollData = this.document.getRollData();
    const effects = await this._prepareEffects();
    const [buffs, conditions] = effects.partition(e => e.effect.type === "condition");

    const context = {
      document: doc,
      resistances: {},
      effects: buffs,
      conditions: conditions,
      health: this.document.system.health,
      tabs: this._getTabs(),
      itemsTab: {
        inventory: this.tabGroups.items === "inventory",
        loot: this.tabGroups.items === "loot"
      },
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode,
      isEditable: this.isEditable
    };

    // Biography.
    context.biography = {
      field: doc.system.schema.getField("biography.value"),
      value: doc.system.biography.value,
      enriched: await TextEditor.enrichHTML(doc.system.biography.value, {
        relativeTo: doc, rollData: rollData
      })
    };

    // Prepare a resistance for rendering.
    const makeResistance = (key, path) => {
      const value = foundry.utils.getProperty(context.isEditMode ? src.system : doc.system, path);
      const {label, color, icon} = CONFIG.SYSTEM.DAMAGE_TYPES[key];
      const field = doc.system.schema.getField(path);
      const name = `system.${path}`;
      const active = context.isEditMode || !!value;
      context.resistances[key] = {field, value, label, color, icon, name, active};
    };
    // Armor and resistances.
    makeResistance("physical", "defenses.armor.value");
    for (const k of Object.keys(doc.system.resistances)) {
      makeResistance(k, `resistances.${k}.value`);
    }
    context.resistances = Object.values(context.resistances);

    // Name and img.
    const {name, img} = context.isPlayMode ? doc : src;
    context.header = {name, img};

    // Prepare items.
    context.items = await this._prepareItems();

    return context;
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareItems() {
    const favorites = [];
    const items = [];
    const loot = [];

    const favoritedItems = this.document.favorites;
    const lootDrops = this.document.lootDrops;

    const contents = this.document.items.contents.sort((a, b) => {
      const sort = a.sort - b.sort;
      if (sort) return sort;
      return a._source.name.localeCompare(b._source.name);
    });

    for (const item of contents) {
      const data = {
        item: item,
        favorited: favoritedItems.has(item),
        isLoot: lootDrops.has(item),
        hasQty: "quantity" in item.system,
        hasUses: item.hasUses,
        hasFusions: item.hasFusions && !item.isFused,
        isExpanded: this._expandedItems.has(item.uuid)
      };
      if (data.isExpanded) {
        data.enrichedText = await TextEditor.enrichHTML(item.system.description.value, {
          relativeTo: item, rollData: item.getRollData()
        });
      }

      if (data.isLoot) loot.push(data);
      if (data.favorited) favorites.push(data);
      if (!data.isLoot && !data.favorited) items.push(data);
    }

    return {favorites, items, loot};
  }
}
