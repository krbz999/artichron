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
    details: {template: "systems/artichron/templates/item/item-details.hbs", scrollable: [""]},
    secondary: {template: "systems/artichron/templates/item/item-secondary.hbs", scrollable: [""]},
    effects: {template: "systems/artichron/templates/shared/effects.hbs", scrollable: [""]}
  };

  /** @override */
  static TABS = {
    description: {id: "description", group: "primary", label: "ARTICHRON.SheetTab.Description"},
    details: {id: "details", group: "primary", label: "ARTICHRON.SheetTab.Details"},
    secondary: {id: "secondary", group: "primary", label: "ARTICHRON.SheetTab.Properties"},
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
      rollData: rollData,
      config: CONFIG.SYSTEM,
      activeFusions: activeFusions,
      effects: buffs,
      fusions: fusionOptions,
      enhancements: enhancements,
      isFavorited: this.actor?.system.equipped.favorites.has(doc) ?? false,
      sections: {
        damage: ("parts" in (src.system.damage ?? {})) && ((doc.type !== "spell") || isOffense),
        resistances: "resistances" in src.system,
        range: ("range" in src.system) && !doc.isAmmo
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
      isItem: true,
      fieldsets: []
    };

    // Name and img.
    context.header = {
      name: context.isPlayMode ? doc.name : src.name,
      img: context.isPlayMode ? doc.img : src.img
    };

    context.details = {};

    // Attributes fieldset
    context.details.attributes = this._makeField(context, "attributes.value", {type: "checkboxes"});

    // Configuration fieldset
    context.details.configuration = [];
    context.details.configuration.push(this._makeField(context, "category.subtype", {blank: false}));
    const hasPool = ("pool" in (src.system.category ?? {})) && !!doc.system.category?.subtype;
    if (hasPool) {
      const pool = this._makeField(context, "category.pool");
      const subtype = doc.system.category.subtype;
      pool.label = `ARTICHRON.ItemProperty.Category.Pool${subtype.capitalize()}`;
      pool.hint = `ARTICHRON.ItemProperty.Category.Pool${subtype.capitalize()}Hint`;
      context.details.configuration.push(pool);
    }
    if ("price" in src.system) {
      context.details.configuration.push(this._makeField(context, "price.value"));
    }
    if ("weight" in src.system) {
      context.details.configuration.push(this._makeField(context, "weight.value"));
    }
    if ("quantity" in src.system) {
      context.details.configuration.push(this._makeField(context, "quantity.value"));
    }

    // Handling fieldset
    context.details.handling = [];
    if ("wield" in src.system) context.details.handling.push(this._makeField(context, "wield.value"));
    if (("range" in src.system) && !doc.isAmmo) {
      context.details.handling.push(this._makeField(context, "range.value"));
    }
    if (doc.type === "spell") context.details.handling.push(this._makeField(context, "template.types"));

    // Range.
    if (context.sections.range) context.range = this._makeField(context, "range.value");
    else if (doc.isAmmo) context.fieldsets.push({
      legend: "ARTICHRON.ItemProperty.Fieldsets.Handling",
      formGroups: [this._makeField(context, "range.value")]
    });

    // Blast zone.
    if (doc.isAmmo) {
      context.fieldsets.push({
        legend: "ARTICHRON.ItemProperty.Fieldsets.BlastZone",
        formGroups: [
          this._makeField(context, "blast.size"),
          this._makeField(context, "blast.type")
        ]
      });
    }

    // Usage.
    if (doc.type === "elixir") {
      context.fieldsets.push({
        legend: "ARTICHRON.ItemProperty.Fieldsets.LimitedUses",
        formGroups: [
          this._makeField(context, "usage.value", {max: doc.system.usage.max || 0}),
          this._makeField(context, "usage.max")
        ]
      });
    }

    // Defenses.
    if (doc.isArmor || (doc.type === "shield")) context.fieldsets.push({
      legend: "ARTICHRON.ItemProperty.Fieldsets.Defenses",
      formGroups: [this._makeField(context, "armor.value")]
    });

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
          group: this._makeField(context, "damage.override.group"),
          value: this._makeField(context, "damage.override.value")
        };
      }
    }

    // Resistances.
    if (doc.isArmor) context.fieldsets.push({
      legend: "ARTICHRON.ItemProperty.Fieldsets.Resistances",
      formGroups: Object.keys(doc.system.resistances).reduce((acc, k) => {
        const data = this._makeField(context, `resistances.${k}.value`);
        if ((data.value !== "") || context.isEditMode) acc.push(data);
        return acc;
      }, [])
    });

    return context;
  }

  /**
   * Utility method to format a data field for the form group helper.
   * @param {object} context        Current rendering context.
   * @param {string} path           The path to the data field, relative to 'system'.
   * @param {object} [options]      Additional data to add.
   * @returns {object}              Object with at least field, value, disabled.
   */
  _makeField(context, path, options = {}) {
    const field = this.document.system.schema.getField(path);
    const formula = field instanceof FormulaField;
    const dv = foundry.utils.getProperty(this.document.system, path);
    const src = foundry.utils.getProperty(context.source, path);
    let value;

    if (formula) {
      if (!dv || (dv === "0")) value = "";
      else if (context.isPlayMode) value = artichron.utils.simplifyBonus(dv, context.rollData);
      else value = src;
    } else {
      value = context.isPlayMode ? dv : src;
    }

    return {field: field, value: value, disabled: context.isPlayMode, ...options};
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
