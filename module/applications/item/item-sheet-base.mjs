import {ArtichronSheetMixin} from "../base-sheet.mjs";

export default class ItemSheetArtichron extends ArtichronSheetMixin(foundry.applications.sheets.ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "item"],
    position: {width: 400, height: "auto"},
    actions: {
      addDamage: this._onAddDamage,
      deleteDamage: this._onDeleteDamage,
      favoriteItem: this._onFavoriteItem
    }
  };

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/partials/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/partials/tabs.hbs"},
    description: {template: "systems/artichron/templates/partials/item-description.hbs", scrollable: [""]},
    details: {template: "systems/artichron/templates/partials/item-details.hbs", scrollable: [""]},
    effects: {template: "systems/artichron/templates/partials/effects.hbs", scrollable: [""]}
  };

  /** @override */
  static TABS = {
    description: {id: "description", group: "primary", label: "ARTICHRON.SheetTab.Description"},
    details: {id: "details", group: "primary", label: "ARTICHRON.SheetTab.Details"},
    effects: {id: "effects", group: "primary", label: "ARTICHRON.SheetTab.Effects"}
  };

  /** @override */
  _sheetMode = this.constructor.SHEET_MODES.EDIT;

  /** @override */
  tabGroups = {
    primary: "description"
  };

  /** @override */
  async _prepareContext(options) {
    const doc = this.document;
    const src = doc.toObject();
    const rollData = doc.getRollData();

    const context = {
      document: doc,
      source: src.system,
      config: CONFIG.SYSTEM,
      effects: this._prepareEffects(),
      isFavorited: this.actor?.system.equipped.favorites.has(doc) ?? false,
      sections: {
        damage: "damage" in src.system,
        armor: "armor" in src.system,
        resistances: "resistances" in src.system,
        wield: "wield" in src.system,
        range: "range" in src.system,
        price: "price" in src.system,
        template: "template" in src.system,
        weight: "weight" in src.system,
        quantity: "quantity" in src.system,
        usage: "usage" in src.system
      },
      description: {
        enriched: await TextEditor.enrichHTML(doc.system.description.value, {
          rollData: rollData, async: true, relativeTo: doc
        }),
        field: doc.system.schema.getField("description.value"),
        value: doc.system.description.value
      },
      tabs: this._getTabs(),
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode
    };

    const makeField = (path, formula = true) => {
      const field = doc.system.schema.getField(path);
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

      return {field: field, value: value, disabled: context.isPlayMode};
    };

    // Subtype options.
    if (doc.type === "weapon") context.subtypes = CONFIG.SYSTEM.ARSENAL_TYPES;
    else if (doc.type === "shield") context.subtypes = CONFIG.SYSTEM.SHIELD_TYPES;
    else if (doc.type === "spell") context.subtypes = CONFIG.SYSTEM.SPELL_TYPES;
    else if (doc.type === "armor") context.subtypes = CONFIG.SYSTEM.ARMOR_TYPES;
    else if (doc.type === "elixir") context.subtypes = CONFIG.SYSTEM.ELIXIR_TYPES;

    // Wield.
    if (context.sections.wield) {
      context.wield = makeField("wield.value", false);
      if (doc.isEquipped) context.wield.disabled = true;
    }

    // Range.
    if (context.sections.range) context.range = makeField("range.value");

    // Price.
    if (context.sections.price) context.price = makeField("price.value");

    // Template types.
    if (context.sections.template) {
      context.templates = Object.entries(CONFIG.SYSTEM.SPELL_TARGET_TYPES).map(([k, v]) => {
        return {key: k, label: v.label, selected: doc.system.template?.types.has(k)};
      });
    }

    // Weight.
    if (context.sections.weight) context.weight = makeField("weight.value");

    // Quantity.
    if (context.sections.quantity) context.quantity = makeField("quantity.value", false);

    // Usage.
    if (context.sections.usage) {
      context.usage = {
        value: makeField("usage.value", false),
        max: makeField("usage.max", true)
      };
    }

    // Defenses.
    if (context.sections.armor) context.armor = makeField("armor.value", false);

    // Damage parts.
    if (context.sections.damage) {
      context.damages = {parts: context.isEditMode ? src.system.damage : doc.system.damage};
      context.damageTypes = Object.entries(CONFIG.SYSTEM.DAMAGE_TYPES).reduce((acc, [k, v]) => {
        acc[v.group][k] = v.label;
        return acc;
      }, {physical: {}, elemental: {}, planar: {}});
    }

    // Resistances.
    if (context.sections.resistances) {
      context.resistances = Object.keys(doc.system.resistances).map(k => {
        return makeField(`resistances.${k}.value`);
      });
    }

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.element.addEventListener("drop", this._onDrop.bind(this));
  }

  /** @override */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "effects") {
      newElement.querySelectorAll("[data-item-uuid].effect").forEach(n => {
        const uuid = n.dataset.itemUuid;
        n = n.querySelector(".wrapper");
        const old = priorElement.querySelector(`[data-item-uuid="${uuid}"].effect .wrapper`);
        if (!old) return;
        n.animate([{opacity: old.style.opacity}, {opacity: n.style.opacity}], {duration: 200, easing: "ease-in-out"});
      });
    }
  }

  /* -------------------------------------------- */
  /*                EVENT HANDLERS                */
  /* -------------------------------------------- */

  async _onDrop(event) {
    const {type, uuid} = TextEditor.getDragEventData(event);
    if (!this.isEditable) return null;
    const item = await fromUuid(uuid);
    const itemData = item.toObject();

    const modification = {
      "-=_id": null,
      "-=ownership": null,
      "-=folder": null,
      "-=sort": null
    };

    switch (type) {
      case "ActiveEffect": {
        foundry.utils.mergeObject(modification, {
          "duration.-=combat": null,
          "duration.-=startRound": null,
          "duration.-=startTime": null,
          "duration.-=startTurn": null,
          origin: (item.type === "fusion") ? item.parent.uuid : this.document.uuid
        });
        break;
      }
      case "Item": {
        break;
      }
      default: return;
    }

    foundry.utils.mergeObject(itemData, modification, {performDeletions: true});
    return getDocumentClass(type).create(itemData, {parent: this.document});
  }

  /** Append a new entry to an array within a fieldset. */
  static _onAddDamage(event, target) {
    const type = (this.document.type === "spell") ? "fire" : "physical";
    const parts = this.document.system.toObject().damage.concat([{formula: "", type: type}]);
    this.document.update({"system.damage": parts});
  }

  /** Remove an entry from an array within a fieldset. */
  static _onDeleteDamage(event, target) {
    const idx = parseInt(target.dataset.idx);
    const parts = this.document.system.toObject().damage;
    parts.splice(idx, 1);
    this.document.update({"system.damage": parts});
  }
  static _onFavoriteItem(event, target) {
    this.document.favorite().then(() => this.render());
  }
}
