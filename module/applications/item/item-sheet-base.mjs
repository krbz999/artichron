import {FormulaField} from "../../documents/fields/formula-field.mjs";
import {ArtichronSheetMixin} from "../base-sheet.mjs";

export default class ItemSheetArtichron extends ArtichronSheetMixin(foundry.applications.sheets.ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "item"],
    position: {
      width: 500,
      height: "auto"
    },
    actions: {
      addDamage: this._onAddDamage,
      deleteDamage: this._onDeleteDamage,
      favoriteItem: this._onFavoriteItem,
      undoFusion: this._onUndoFusion
    }
  };

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/shared/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/shared/tabs.hbs"},
    description: {template: "systems/artichron/templates/item/item-description.hbs", scrollable: [""]},
    details: {
      template: "systems/artichron/templates/item/item-details.hbs",
      templates: ["systems/artichron/templates/item/item-type.hbs"],
      scrollable: [""]
    },
    effects: {template: "systems/artichron/templates/shared/effects.hbs", scrollable: [""]}
  };

  /** @override */
  static TABS = {
    description: {id: "description", group: "primary", label: "ARTICHRON.SheetTab.Description"},
    details: {id: "details", group: "primary", label: "ARTICHRON.SheetTab.Details"},
    effects: {id: "effects", group: "primary", label: "ARTICHRON.SheetTab.Effects"}
  };

  /** @override */
  tabGroups = {
    primary: "description"
  };

  /** @override */
  async _prepareContext(options) {
    const doc = this.document;
    const src = doc.toObject();
    const rollData = doc.getRollData();

    const [activeFusions, buffs, fusionOptions, enhancements] = (await this._prepareEffects()).reduce((acc, data) => {
      if (data.isActiveFusion) acc[0].push(data);
      else if (data.isFusionOption) acc[2].push(data);
      else if (data.effect.type === "enhancement") acc[3].push(data);
      else acc[1].push(data);
      return acc;
    }, [[], [], [], []]);

    const isOffense = (doc.type === "spell") && (doc.system.category.subtype === "offense");

    const context = {
      document: doc,
      source: src.system,
      config: CONFIG.SYSTEM,
      activeFusions: activeFusions,
      effects: buffs,
      fusions: fusionOptions,
      enhancements: enhancements,
      isFavorited: this.actor?.system.equipped.favorites.has(doc) ?? false,
      sections: {
        damage: ("parts" in (src.system.damage ?? {})) && ((doc.type !== "spell") || isOffense),
        armor: "armor" in src.system,
        resistances: "resistances" in src.system,
        wield: "wield" in src.system,
        range: "range" in src.system,
        price: "price" in src.system,
        template: "template" in src.system,
        blast: "blast" in src.system,
        weight: "weight" in src.system,
        quantity: "quantity" in src.system,
        usage: "usage" in src.system,
        category: "category" in src.system,
        categoryPool: ("pool" in (src.system.category ?? {})) && !!doc.system.category?.subtype
      },
      description: {
        enriched: await TextEditor.enrichHTML(doc.system.description.value, {
          rollData: rollData, async: true, relativeTo: doc
        }),
        field: doc.system.schema.getField("description.value"),
        value: doc.system.description.value,
        uuid: doc.uuid
      },
      tabs: this._getTabs(),
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode,
      isEditable: this.isEditable,
      canFuse: doc.canFuse,
      isAmmo: doc.isAmmo,
      isItem: true
    };

    // Name and img.
    context.header = {
      name: context.isPlayMode ? doc.name : src.name,
      img: context.isPlayMode ? doc.img : src.img
    };

    const makeField = (path, options = {}) => {
      const field = doc.system.schema.getField(path);
      const formula = field instanceof FormulaField;
      const dv = foundry.utils.getProperty(doc.system, path);
      const src = foundry.utils.getProperty(context.source, path);
      let value;

      if (formula) {
        if (!dv || (dv === "0")) value = "";
        else if (context.isPlayMode) value = artichron.utils.simplifyBonus(dv, rollData);
        else value = src;
      } else {
        value = context.isPlayMode ? dv : src;
      }

      return {field: field, value: value, disabled: context.isPlayMode, ...options};
    };

    // Subtype options.
    if (context.sections.category) {
      context.category = makeField("category.subtype", doc.isEquipped ? {disabled: true} : undefined);
      if (context.sections.categoryPool) {
        context.categoryPool = makeField("category.pool");
        const subtype = doc.system.category.subtype;
        context.categoryPool.label = `ARTICHRON.ItemProperty.Category.Pool${subtype.capitalize()}`;
        context.categoryPool.hint = `ARTICHRON.ItemProperty.Category.Pool${subtype.capitalize()}Hint`;
      }
    }

    // Wield.
    if (context.sections.wield) {
      context.wield = makeField("wield.value", doc.isEquipped ? {disabled: true} : undefined);
    }

    // Range.
    if (context.sections.range) context.range = makeField("range.value");

    // Price.
    if (context.sections.price) context.price = makeField("price.value");

    // Template types.
    if (context.sections.template) context.template = makeField("template.types");

    // Blast zone.
    if (context.sections.blast) {
      context.blastSize = makeField("blast.size");
      context.blastType = makeField("blast.type");
    }

    // Weight.
    if (context.sections.weight) context.weight = makeField("weight.value");

    // Quantity.
    if (context.sections.quantity) context.quantity = makeField("quantity.value");

    // Usage.
    if (context.sections.usage) {
      context.usage = {
        value: makeField("usage.value"),
        max: makeField("usage.max")
      };
      context.usage.value.max = doc.system.usage.max || 0;
    }

    // Defenses.
    if (context.sections.armor) context.armor = makeField("armor.value");

    // Damage parts.
    if (context.sections.damage) {
      context.damageTypes = [];
      context.damages = {
        parts: (context.isEditMode ? src.system.damage.parts : doc.system._damages).map((k, idx) => {
          return {
            id: {
              field: doc.system.schema.getField("damage.parts.element.id"),
              value: k.id,
              name: `system.damage.parts.${idx}.id`,
              disabled: !context.isEditMode
            },
            formula: {
              field: doc.system.schema.getField("damage.parts.element.formula"),
              value: k.formula,
              name: `system.damage.parts.${idx}.formula`,
              disabled: !context.isEditMode
            },
            type: {
              field: doc.system.schema.getField("damage.parts.element.type"),
              value: k.type,
              name: `system.damage.parts.${idx}.type`,
              disabled: !context.isEditMode,
              options: context.damageTypes
            }
          };
        }),
        groups: CONFIG.SYSTEM.DAMAGE_TYPE_GROUPS
      };

      for (const [k, v] of Object.entries(CONFIG.SYSTEM.DAMAGE_TYPES)) {
        context.damageTypes.push({
          group: context.damages.groups[v.group].label,
          value: k,
          label: v.label
        });
      }

      // Damage type override (ammo).
      if (context.isAmmo) {
        context.damages.override = {
          group: makeField("damage.override.group"),
          value: makeField("damage.override.value")
        };
      }
    }

    // Resistances.
    if (context.sections.resistances) {
      context.resistances = Object.keys(doc.system.resistances).reduce((acc, k) => {
        const data = makeField(`resistances.${k}.value`);
        if ((data.value !== "") || context.isEditMode) acc.push(data);
        return acc;
      }, []);
    }

    return context;
  }

  /* ---------------------------------------- */
  /*              EVENT HANDLERS              */
  /* ---------------------------------------- */

  /**
   * Handle click events to add a new damage formula.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static _onAddDamage(event, target) {
    if (!this.isEditable) return;
    const type = (this.document.type === "spell") ? "fire" : "physical";
    const parts = this.document.system.toObject().damage.parts.concat([{
      type: type,
      formula: "",
      id: foundry.utils.randomID()
    }]);
    this.document.update({"system.damage.parts": parts});
  }

  /**
   * Handle click events to remove a particular damage formula.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static _onDeleteDamage(event, target) {
    if (!this.isEditable) return;
    const id = target.closest("[data-id]").dataset.id;
    const parts = this.document.system.toObject().damage.parts;
    parts.findSplice(d => d.id === id);
    this.document.update({"system.damage.parts": parts});
  }

  /**
   * Handle click events to toggle an item's Favorited state.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static _onFavoriteItem(event, target) {
    if (!this.isEditable) return;
    this.document.favorite().then(() => this.render());
  }

  /**
   * Handle click events to unfuse this item.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static async _onUndoFusion(event, target) {
    if (!this.isEditable) return;
    const effect = await fromUuid(target.closest("[data-item-uuid]").dataset.itemUuid);
    effect.unfuseDialog();
  }
}
