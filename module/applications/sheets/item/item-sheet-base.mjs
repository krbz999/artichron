import ArtichronSheetMixin from "../../api/document-sheet-mixin.mjs";

/**
 * @mixes foundry.applications.api.HandlebarsApplicationMixin
 * @extends {foundry.applications.sheets.ItemSheet}
 */
export default class ItemSheetArtichron extends ArtichronSheetMixin(foundry.applications.sheets.ItemSheet) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["item"],
    position: {
      width: 350,
      height: "auto",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: "systems/artichron/templates/sheets/item/item-sheet/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    description: {
      template: "systems/artichron/templates/sheets/item/item-sheet/description.hbs",
      scrollable: [""],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "description", icon: "fa-solid fa-fw fa-pen-fancy" },
        { id: "details", icon: "fa-solid fa-fw fa-tags" },
        { id: "fusion", icon: "fa-solid fa-fw fa-volcano" },
        { id: "activities", icon: "fa-solid fa-fw fa-location-crosshairs " },
        { id: "advancements", icon: "fa-solid fa-fw fa-circle-nodes" },
        { id: "effects", icon: "fa-solid fa-fw fa-bolt" },
      ],
      labelPrefix: "ARTICHRON.SHEET.TABS",
      initial: "description",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _sheetMode = this.document.isEmbedded ? this.constructor.SHEET_MODES.PLAY : this.constructor.SHEET_MODES.EDIT;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);

    // Add context menu for effects.
    this._createContextMenu(
      this.#getContextOptionsActiveEffect,
      ".document-list.effects .entry",
      { hookName: "ActiveEffectEntryContext" },
    );

    // Add context menu for activities.
    this._createContextMenu(
      this.#getContextOptionsActivity,
      ".document-list.activities .entry",
      { hookName: "ActivityEntryContext" },
    );

    // Add context menu for advancements.
    this._createContextMenu(
      this.#getContextOptionsAdvancement,
      ".document-list.advancements .entry",
      { hookName: "AdvancementEntryContext" },
    );

    // Add context menu for armor requirements.
    this._createContextMenu(
      this.#getContextOptionsArmorRequirement,
      ".document-list.armor-requirements .entry",
      { hookName: "ArmorRequirementEntryContext" },
    );
  }

  /* -------------------------------------------------- */
  /*   Context menu                                     */
  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for ActiveEffects.
   * @returns {object[]}
   */
  #getContextOptionsActiveEffect() {
    if (!this.document.isOwner) return [];
    const getEffect = btn => this.document.effects.get(btn.dataset.id);

    return [{
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.EFFECT.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      callback: btn => getEffect(btn).sheet.render({ force: true }),
      group: "manage",
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.EFFECT.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      condition: btn => !getEffect(btn).isActiveFusion,
      callback: btn => getEffect(btn).deleteDialog(),
      group: "manage",
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.EFFECT.enable",
      icon: "<i class='fa-solid fa-fw fa-toggle-on'></i>",
      condition: btn => getEffect(btn).disabled,
      callback: btn => getEffect(btn).update({ disabled: false }),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.EFFECT.disable",
      icon: "<i class='fa-solid fa-fw fa-toggle-off'></i>",
      condition: btn => !getEffect(btn).disabled && (getEffect(btn).type !== "fusion"),
      callback: btn => getEffect(btn).update({ disabled: true }),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.EFFECT.duplicate",
      icon: "<i class='fa-solid fa-fw fa-copy'></i>",
      condition: btn => !getEffect(btn).isActiveFusion,
      callback: btn => {
        const effect = getEffect(btn);
        effect.clone(
          { name: game.i18n.format("DOCUMENT.CopyOf", { name: effect._source.name }) },
          { save: true, addSource: true },
        );
      },
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.EFFECT.unfuse",
      icon: "<i class='fa-solid fa-fw fa-volcano'></i>",
      condition: btn => getEffect(btn).isActiveFusion,
      callback: btn => getEffect(btn).unfuseDialog(),
      group: "action",
    }];
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for activities.
   * @returns {object[]}
   */
  #getContextOptionsActivity() {
    if (!this.document.isOwner) return [];

    return [{
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.ACTIVITY.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).sheet.render({ force: true }),
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.ACTIVITY.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).delete(),
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.ACTIVITY.duplicate",
      icon: "<i class='fa-solid fa-fw fa-copy'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).duplicate(),
    }];
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for advancements.
   * @returns {object[]}
   */
  #getContextOptionsAdvancement() {
    if (!this.document.isOwner) return [];

    return [{
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.ADVANCEMENT.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).sheet.render({ force: true }),
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.ADVANCEMENT.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).delete(),
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.ADVANCEMENT.duplicate",
      icon: "<i class='fa-solid fa-fw fa-copy'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).duplicate(),
    }];
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for armor requirements.
   * @returns {object[]}
   */
  #getContextOptionsArmorRequirement() {
    if (!this.document.isOwner) return [];

    return [{
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.REQUIREMENT.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).sheet.render({ force: true }),
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.REQUIREMENT.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).delete(),
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.REQUIREMENT.duplicate",
      icon: "<i class='fa-solid fa-fw fa-copy'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).duplicate(),
    }];
  }

  /* -------------------------------------------------- */
  /*   Context preparation                              */
  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextHeader(context, options) {
    context.ctx = {
      name: context.isPlayMode ? this.document.name : this.document._source.name,
      img: context.isPlayMode ? this.document.img : this.document._source.img,
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextTabs(context, options) {
    context = await super._preparePartContextTabs(context, options);
    for (const k in context.tabs)
      if (this.constructor.metadata.excludeTabs.includes(k))
        delete context.tabs[k];
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDescription(context, options) {
    context.ctx = {
      descriptionValue: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.document.system.description.value,
        { relativeTo: this.document, rollData: context.rollData },
      ),
    };
    return context;
  }
}
