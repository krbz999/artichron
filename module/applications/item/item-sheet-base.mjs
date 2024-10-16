import ArtichronSheetMixin from "../base-sheet.mjs";
import FormulaField from "../../documents/fields/formula-field.mjs";

export default class ItemSheetArtichron extends ArtichronSheetMixin(foundry.applications.sheets.ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["item"],
    position: {
      width: 500,
      height: "auto"
    },
    actions: {
      addRequirement: ItemSheetArtichron.#addRequirement,
      createActivity: ItemSheetArtichron.#createActivity,
      deleteRequirement: ItemSheetArtichron.#deleteRequirement,
      renderActivity: ItemSheetArtichron.#renderActivity,
      undoFusion: ItemSheetArtichron.#onUndoFusion
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/shared/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/shared/tabs.hbs"},
    description: {template: "systems/artichron/templates/item/item-description.hbs", scrollable: [""]},
    details: {template: "systems/artichron/templates/item/item-details.hbs", scrollable: [""]},
    activities: {template: "systems/artichron/templates/item/item-activities.hbs", scrollable: [""]},
    fusion: {template: "systems/artichron/templates/item/item-fusion.hbs", scrollable: [""]},
    effects: {template: "systems/artichron/templates/shared/effects.hbs", scrollable: [""]}
  };

  /* -------------------------------------------------- */

  /** @override */
  static TABS = {
    description: {id: "description", group: "primary", label: "ARTICHRON.SheetLabels.Description"},
    details: {id: "details", group: "primary", label: "ARTICHRON.SheetLabels.Details"},
    activities: {id: "activities", group: "primary", label: "ARTICHRON.SheetLabels.Activities"},
    fusion: {id: "fusion", group: "primary", label: "ARTICHRON.SheetLabels.Fusion"},
    effects: {id: "effects", group: "primary", label: "ARTICHRON.SheetLabels.Effects"}
  };

  /* -------------------------------------------------- */

  /** @override */
  _sheetMode = this.constructor.SHEET_MODES.EDIT;

  /* -------------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "description"
  };

  /* -------------------------------------------------- */

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

    const context = {
      document: doc,
      source: src.system,
      rollData: rollData,
      config: CONFIG.SYSTEM,
      activeFusions: activeFusions,
      effects: buffs,
      fusions: fusionOptions,
      enhancements: enhancements,
      description: {
        enriched: await TextEditor.enrichHTML(doc.system.description.value, {
          rollData: rollData, relativeTo: doc
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
      isArmor: doc.isArmor,
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
    const attrs = this.document.system.attributes.value;
    context.details.attributes = {
      legend: this.document.system.schema.getField("attributes").label,
      values: {
        field: this.document.system.schema.getField("attributes.value"),
        value: this.document.system._source.attributes.value
      },
      levels: {
        field: this.document.system.schema.getField("attributes.levels"),
        fields: []
      }
    };

    for (const attr of attrs) {
      const status = CONFIG.SYSTEM.ITEM_ATTRIBUTES[attr]?.status;
      if (status) {
        const path = `attributes.levels.${status}`;
        context.details.attributes.levels.fields.push(this._makeField(context, path));
      }
    }

    // Show ammunition dropdown on weapons.
    if (this.document.system.schema.has("ammunition") && attrs.has("ammunition")) {
      context.details.attributes.ammo = {
        show: true,
        ...this._makeField(context, "ammunition.type")
      };
    }

    // Show booster dropdown on elixirs.
    if (this.document.system.schema.has("boost") && attrs.has("booster")) {
      context.details.attributes.boost = {
        show: true,
        ...this._makeField(context, "boost")
      };
    }

    // Configuration fieldset
    context.details.configuration = [];
    if (doc.system.schema.has("wield")) {
      context.details.configuration.push(this._makeField(context, "wield.value"));
    }
    if (doc.system.schema.has("category")) {
      context.details.configuration.push(this._makeField(context, "category.subtype"));
    }
    if (doc.system.schema.has("price")) {
      context.details.configuration.push(this._makeField(context, "price.value"));
    }
    if (doc.system.schema.has("weight")) {
      context.details.configuration.push(this._makeField(context, "weight.value"));
    }
    if (doc.system.schema.has("quantity")) {
      context.details.configuration.push(this._makeField(context, "quantity.value"));
    }
    if (doc.system.schema.has("fusion")) {
      context.fusionFields = {
        label: this.document.system.schema.getField("fusion").label,
        max: this._makeField(context, "fusion.max"),
        ignore: this._makeField(context, "fusion.ignore")
      };
      context.fusionFields.ignore.choices = this.document.defaultFusionProperties.reduce((acc, path) => {
        acc.push({value: path, label: this.document.system.schema.getField(path).label});
        return acc;
      }, []);
    }

    // Defenses.
    if (doc.system.schema.has("armor")) context.fieldsets.push({
      legend: game.i18n.localize("ARTICHRON.SheetLabels.Defenses"),
      formGroups: [this._makeField(context, "armor.value")]
    });

    const makeResistance = field => {
      const value = foundry.utils.getProperty(context.isEditMode ? src : doc, field.fields.value.fieldPath);
      return {
        field: field.fields.value,
        value: context.isPlayMode ? (value ?? 0) : (value ? value : null),
        label: CONFIG.SYSTEM.DAMAGE_TYPES[field.name].label,
        color: CONFIG.SYSTEM.DAMAGE_TYPES[field.name].color,
        icon: CONFIG.SYSTEM.DAMAGE_TYPES[field.name].icon,
        active: context.isEditMode || !!value
      };
    };

    // Resistances.
    if (doc.isArmor) {
      const field = this.document.system.schema.getField("resistances");
      const fieldset = {
        legend: field.label,
        values: []
      };
      for (const k of field) {
        fieldset.values.push(makeResistance(k));
      }

      context.resistances = fieldset;
    }

    // Armor requirements.
    if (doc.isArmor) {
      const requirements = [];
      for (const [i, r] of this.document.system.category.requirements.entries()) {
        const _path = `system.category.requirements.${i}`;
        const fields = [];
        for (const field of r.schema) {
          const name = `${_path}.${field.fieldPath}`;
          const value = r[field.fieldPath];
          fields.push({field, name, value});
        }
        requirements.push({
          idx: i,
          fields: fields,
          hint: r.schema.model.metadata.hint
        });
      }
      context.armorRequirements = requirements;
    }

    // Activities.
    context.activities = this.document.system.activities.map(activity => {
      return {
        id: activity.id,
        name: activity.name,
        subtitle: game.i18n.localize(activity.constructor.metadata.label),
        disabled: !context.isEditable || !(activity.id in src.system.activities)
      };
    });

    return context;
  }

  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */
  /*   Context menu handlers                            */
  /* -------------------------------------------------- */

  /** @override */
  _setupContextMenu() {
    super._setupContextMenu();

    new artichron.applications.ContextMenuArtichron(this.element, "[data-activity-id]", [], {onOpen: element => {
      const activity = this.document.system.activities.get(element.dataset.activityId);
      ui.context.menuItems = this.#getActivityContextOptions(activity);
    }});
  }

  /* -------------------------------------------------- */

  /**
   * Set up context menu options for activities.
   * @param {BaseActivity} activity     The current activity.
   * @returns {object[]}
   */
  #getActivityContextOptions(activity) {
    if (!(activity.id in this.document._source.system.activities)) return [];

    return [{
      name: "ARTICHRON.ContextMenu.Activity.Render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      callback: () => activity.sheet.render({force: true})
    }, {
      name: "ARTICHRON.ContextMenu.Activity.Delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      callback: () => activity.delete()
    }, {
      name: "ARTICHRON.ContextMenu.Activity.Duplicate",
      icon: "<i class='fa-solid fa-fw fa-copy'></i>",
      callback: () => activity.constructor.create(activity.item, activity.toObject())
    }];
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle click events to unfuse this item.
   * @this {ItemSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static async #onUndoFusion(event, target) {
    if (!this.isEditable) return;
    const effect = await fromUuid(target.closest("[data-item-uuid]").dataset.itemUuid);
    effect.unfuseDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to add an armor requirement.
   * @this {ItemSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #addRequirement(event, target) {
    if (!this.isEditable) return;
    const types = new Set(Object.keys(artichron.fields.ArmorRequirementData.TYPES));
    // for (const {type} of this.document.system.category.requirements) types.delete(type);
    const requirements = this.document.system.toObject().category.requirements;
    requirements.push({type: types.first()});
    this.document.update({"system.category.requirements": requirements});
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to remove an armor requirement.
   * @this {ItemSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #deleteRequirement(event, target) {
    if (!this.isEditable) return;
    const idx = parseInt(target.closest("[data-idx]").dataset.idx);
    const requirements = this.document.system.toObject().category.requirements;
    requirements.splice(idx, 1);
    this.document.update({"system.category.requirements": requirements});
  }

  /* -------------------------------------------------- */

  /**
   * Create an activity.
   * @this {ItemSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #createActivity(event, target) {
    const types = Object.values(artichron.activities).reduce((acc, v) => {
      acc[v.metadata.type] = game.i18n.localize(v.metadata.label);
      return acc;
    }, {});
    const select = new foundry.data.fields.StringField({
      required: true,
      choices: types,
      label: "Type"
    }).toFormGroup({}, {name: "type"}).outerHTML;
    foundry.applications.api.DialogV2.prompt({
      content: `<fieldset>${select}</fieldset>`,
      ok: {callback: (event, button) => {
        const type = button.form.elements.type.value;
        const cls = Object.values(artichron.activities).find(a => a.metadata.type === type);
        cls.create(this.document, {
          type: type,
          name: game.i18n.localize(cls.metadata.label)
        });
      }}
    });
  }

  /* -------------------------------------------------- */

  /**
   * Render an activity's sheet.
   * @this {ItemSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #renderActivity(event, target) {
    const id = target.closest("[data-activity-id]").dataset.activityId;
    const activity = this.document.system.activities.get(id);
    activity.sheet.render({force: true});
  }
}
