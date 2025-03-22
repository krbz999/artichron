import ArtichronSheetMixin from "../../api/document-sheet-mixin.mjs";

export default class ItemSheetArtichron extends ArtichronSheetMixin(foundry.applications.sheets.ItemSheet) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["item"],
    position: {
      width: 500,
      height: "auto",
    },
    actions: {
      addRequirement: ItemSheetArtichron.#addRequirement,
      createActivity: ItemSheetArtichron.#createActivity,
      deleteRequirement: ItemSheetArtichron.#deleteRequirement,
      renderActivity: ItemSheetArtichron.#renderActivity,
      undoFusion: ItemSheetArtichron.#onUndoFusion,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: "systems/artichron/templates/shared/sheet-header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    description: {
      template: "systems/artichron/templates/item/item-description.hbs",
      scrollable: [""],
    },
    details: {
      template: "systems/artichron/templates/item/item-details.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    activities: {
      template: "systems/artichron/templates/item/item-activities.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    fusion: {
      template: "systems/artichron/templates/item/item-fusion.hbs",
      scrollable: [""],
      types: {
        ammo: false,
        elixir: false,
        part: false,
      },
    },
    effects: {
      template: "systems/artichron/templates/shared/effects.hbs",
      classes: ["scrollable"],
      scrollable: [""],
      types: {
        ammo: false,
        part: false,
      },
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "description" },
        { id: "details" },
        { id: "activities" },
        { id: "fusion" },
        { id: "effects" },
      ],
      initial: "description",
      labelPrefix: "ARTICHRON.SHEET.TABS",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _sheetMode = this.document.isEmbedded ? this.constructor.SHEET_MODES.PLAY : this.constructor.SHEET_MODES.EDIT;

  /* -------------------------------------------------- */

  /** @inheritdoc */
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
      ...await super._prepareContext(options),
      document: doc,
      source: src.system,
      rollData: rollData,
      config: artichron.config,
      activeFusions: activeFusions,
      effects: buffs,
      fusions: fusionOptions,
      enhancements: enhancements,
      description: {
        enriched: await TextEditor.enrichHTML(doc.system.description.value, {
          rollData: rollData, relativeTo: doc,
        }),
        field: doc.system.schema.getField("description.value"),
        value: doc.system.description.value,
        uuid: doc.uuid,
      },
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode,
      isEditable: this.isEditable,
      canFuse: doc.canFuse,
      isArmor: doc.isArmor,
      isItem: true,
      fieldsets: [],
    };

    // Name and img.
    context.header = {
      name: context.isPlayMode ? doc.name : src.name,
      img: context.isPlayMode ? doc.img : src.img,
    };

    context.details = {};

    // Attributes fieldset
    const attrs = this.document.system.attributes.value;
    context.details.attributes = {
      legend: this.document.system.schema.getField("attributes").label,
      values: {
        field: this.document.system.schema.getField("attributes.value"),
        value: this.document.system._source.attributes.value,
      },
      levels: {
        field: this.document.system.schema.getField("attributes.levels"),
        fields: [],
      },
    };

    for (const attr of attrs) {
      const status = artichron.config.ITEM_ATTRIBUTES[attr]?.status;
      if (status) {
        const path = `attributes.levels.${status}`;
        const name = `system.${path}`;
        const label = game.i18n.localize(`ARTICHRON.CONDITIONS.FIELDS.${status}.label`);
        const field = this.document.system.schema.getField("attributes.levels.element");
        const value = foundry.utils.getProperty(this.isEditMode ? src.system : doc.system, path);
        context.details.attributes.levels.fields.push({ name, label, field, value });
      }
    }

    // Show ammunition dropdown on weapons.
    if (this.document.usesAmmo) {
      context.details.attributes.ammo = {
        show: true,
        ...this._makeField(context, "ammunition.type"),
      };
    }

    // Show booster dropdown on elixirs.
    if (this.document.isBooster) {
      context.details.attributes.boost = {
        show: true,
        ...this._makeField(context, "boost"),
      };
    }

    // Configuration fieldset
    context.details.configuration = [];
    if (doc.system.schema.has("category")) {
      context.details.configuration.push(this._makeField(context, "category.subtype"));
    }
    if (doc.system.schema.getField("category.value")) {
      context.details.configuration.push(this._makeField(context, "category.value"));
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
        ignore: this._makeField(context, "fusion.ignore"),
      };
      context.fusionFields.ignore.choices = this.document.defaultFusionProperties.reduce((acc, path) => {
        acc.push({ value: path, label: this.document.system.schema.getField(path).label });
        return acc;
      }, []);
    }

    const makeResistance = field => {
      const value = foundry.utils.getProperty(context.isEditMode ? src : doc, field.fields.value.fieldPath);
      return {
        field: field.fields.value,
        value: context.isPlayMode ? (value ?? 0) : (value ? value : null),
        label: artichron.config.DAMAGE_TYPES[field.name].label,
        color: artichron.config.DAMAGE_TYPES[field.name].color,
        icon: artichron.config.DAMAGE_TYPES[field.name].icon,
        active: context.isEditMode || !!value,
      };
    };

    // Resistances.
    if (doc.isArmor) {
      const field = this.document.system.schema.getField("defenses");
      const fieldset = {
        legend: field.label,
        values: [],
      };
      for (const k of field) {
        fieldset.values.push(makeResistance(k));
      }

      context.defenses = fieldset;
    }

    // Armor requirements.
    if (doc.isArmor) {
      const requirements = [];
      const ids = Object.keys(this.document.system._source.category.requirements);
      const current = this.document.system.category.requirements;

      for (const r of current) {
        if (!ids.includes(r.id)) continue;
        const fields = [];
        for (const field of r.schema) {
          if (field.readonly) continue;
          const name = `system.category.requirements.${r.id}.${field.name}`;
          const value = r[field.name];
          fields.push({ field, name, value });
        }
        requirements.push({
          fields: fields,
          id: r.id,
          hint: game.i18n.localize(r.constructor.metadata.hint),
        });
      }
      context.armorRequirements = requirements;
    }

    // Elixir uses.
    if (doc.type === "elixir") {
      context.fieldsets.push({
        legend: this.document.system.schema.getField("usage").label,
        formGroups: [
          this._makeField(context, "usage.spent", { max: context.document.system.usage.max }),
          this._makeField(context, "usage.max"),
        ],
      });
    }

    // Activities.
    const activities = this.isEditMode ? this.document.system.activities.sourceContents : this.document.system.activities;
    context.activities = activities.map(activity => {
      return {
        id: activity.id,
        name: activity.name ? activity.name : game.i18n.localize(activity.constructor.metadata.defaultName),
        subtitle: game.i18n.localize(activity.constructor.metadata.label),
        disabled: !context.isEditable || !(activity.id in src.system.activities),
      };
    });

    return context;
  }

  /* -------------------------------------------------- */

  _onRender(...args) {
    super._onRender(...args);
    this._setupContextMenu(this._getActivityEntryContextOptions, "[data-activity-id]", "ActivityEntryContext");
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
    const dv = foundry.utils.getProperty(this.document.system, path);
    const src = foundry.utils.getProperty(context.source, path);
    const value = context.isPlayMode ? dv : src;

    return { field: field, value: value, disabled: context.isPlayMode, ...options };
  }

  /* -------------------------------------------------- */
  /*   Context menu handlers                            */
  /* -------------------------------------------------- */

  /**
   * Create context menu option for activities.
   * @returns {ContextMenuEntry[]}
   */
  _getActivityEntryContextOptions() {
    const getActivity = element => this.document.getEmbeddedDocument("Activity", element.dataset.activityId);

    return [{
      name: "ARTICHRON.ContextMenu.Activity.Render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      condition: element => getActivity(element).isSource,
      callback: element => getActivity(element).sheet.render({ force: true }),
    }, {
      name: "ARTICHRON.ContextMenu.Activity.Delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      condition: element => getActivity(element).isSource,
      callback: element => getActivity(element).delete(),
    }, {
      name: "ARTICHRON.ContextMenu.Activity.Duplicate",
      icon: "<i class='fa-solid fa-fw fa-copy'></i>",
      condition: element => getActivity(element).isSource,
      callback: element => getActivity(element).duplicate(),
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
  static async #addRequirement(event, target) {
    if (!this.isEditable) return;

    const choices = Object.entries(
      artichron.data.pseudoDocuments.armorRequirements.BaseArmorRequirement.TYPES,
    ).reduce((acc, [k, v]) => {
      acc[k] = v.metadata.label;
      return acc;
    }, {});

    const html = new foundry.data.fields.StringField({
      required: true,
      choices: choices,
      label: "Requirement",
    }).toFormGroup({}, { name: "type" }).outerHTML;

    const configuration = await artichron.applications.api.Dialog.input({
      content: `<fieldset>${html}</fieldset>`,
    });
    if (!configuration) return;

    const data = { type: configuration.type, _id: foundry.utils.randomID() };
    this.document.update({ [`system.category.requirements.${data._id}`]: data });
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
    const id = target.closest("[data-id]").dataset.id;
    this.document.update({ [`system.category.requirements.-=${id}`]: null });
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
      if (v.TYPE) acc[v.TYPE] = game.i18n.localize(v.metadata.label);
      return acc;
    }, {});
    const select = new foundry.data.fields.StringField({
      required: true,
      choices: types,
      label: "Type",
    }).toFormGroup({}, { name: "type" }).outerHTML;
    artichron.applications.api.Dialog.prompt({
      content: `<fieldset>${select}</fieldset>`,
      ok: { callback: (event, button) => {
        const type = button.form.elements.type.value;
        artichron.data.pseudoDocuments.activities.BaseActivity.create({ type: type }, { parent: this.document });
      } },
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
    activity.sheet.render({ force: true });
  }
}
