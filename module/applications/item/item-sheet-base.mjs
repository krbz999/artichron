import {SYSTEM} from "../../helpers/config.mjs";
import {ArtichronSheetMixin} from "../base-sheet.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export default class ItemSheetArtichron extends ArtichronSheetMixin(ItemSheet) {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 400,
      tabs: [
        {navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description", group: "primary"},
        {
          navSelector: "[data-tab=effects] > .effects.tabs[data-group=effects]",
          contentSelector: ".tab.effects",
          initial: "active",
          group: "effects"
        }
      ],
      classes: ["sheet", "item", "artichron"],
      scrollY: [".editor-content", ".documents-list"]
    });
  }

  /** @override */
  get template() {
    return "systems/artichron/templates/item/item-sheet.hbs";
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const data = super.getData();
    foundry.utils.mergeObject(data, {
      context: {
        effects: this._prepareEffects(),
        isFavorited: this.document.actor?.system.equipped.favorites.has(this.document) ?? null,
        templates: Object.entries(SYSTEM.SPELL_TARGET_TYPES).map(([k, v]) => {
          return {key: k, label: v.label, selected: this.item.system.template?.types.has(k)};
        }),
        sections: {
          damage: !!this.document.system.damage,
          armor: !!this.document.system.armor,
          resistances: !!this.document.system.resistances
        },
        resistances: Object.entries(this.document.system.resistances ?? {}).map(([k, v]) => {
          return {...v, key: k, label: game.i18n.localize(`ARTICHRON.DamageType.${k.capitalize()}`)};
        }).sort((a, b) => a.label.localeCompare(b.label))
      },
      descriptions: {
        value: await TextEditor.enrichHTML(this.document.system.description.value, {
          rollData: data.rollData, async: true
        })
      }
    });

    if (data.isWeapon) {
      data.context.subtypes = data.config.ARSENAL_TYPES;
    } else if (data.isShield) {
      data.context.subtypes = data.config.SHIELD_TYPES;
    } else if (data.isSpell) {
      data.context.subtypes = data.config.SPELL_TYPES;
    } else if (data.isArmor) {
      data.context.subtypes = data.config.ARMOR_TYPES;
    } else if (data.isElixir) {
      data.context.subtypes = data.config.ELIXIR_TYPES;
    }
    return data;
  }

  async _updateObject(event, formData) {
    formData["system.template.types"] ??= [];
    return super._updateObject(event, formData);
  }

  /**
   * Prepare effects for rendering.
   * @returns {object}
   */
  _prepareEffects() {
    const {active, inactive} = this.document.effects.reduce((acc, effect) => {
      const data = {
        effect: effect,
        icon: !effect.disabled ? "fa-times" : "fa-check"
      };
      acc[effect.disabled ? "inactive" : "active"].push(data);
      return acc;
    }, {active: [], inactive: []});
    return {
      active: {label: "ARTICHRON.EffectsEnabled", data: active, key: "active"},
      inactive: {label: "ARTICHRON.EffectsDisabled", data: inactive, key: "inactive"}
    };
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    // listeners that always work go here
    if (!this.isEditable) return;
    html = html[0];
    html.querySelectorAll("[data-action]").forEach(n => {
      switch (n.dataset.action) {
        case "control": n.addEventListener("click", this._onClickManageItem.bind(this)); break;
        case "add": n.addEventListener("click", this._onClickAddFieldset.bind(this)); break;
        case "del": n.addEventListener("click", this._onClickDelFieldSet.bind(this)); break;
      }
    });
    for (const element of html.querySelectorAll("multi-select")) {
      element.addEventListener("change", this._onChangeInput.bind(this));
    }
  }

  /**
   * Handle clicking an item control.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {Promise<*>}
   */
  async _onClickManageItem(event) {
    const control = event.currentTarget.dataset.control;
    const collection = this.document.getEmbeddedCollection("effects");

    // Create a new document.
    if (control === "create") {
      return collection.documentClass.create({
        name: game.i18n.format("DOCUMENT.New", {type: game.i18n.localize("DOCUMENT.ActiveEffect")}),
        icon: "icons/svg/sun.svg",
        disabled: event.currentTarget.closest("[data-active]").dataset.active === "inactive"
      }, {parent: this.document, renderSheet: true});
    }

    // Show the document's sheet.
    else if (control === "edit") {
      const id = event.currentTarget.closest("[data-item-id]").dataset.itemId;
      return collection.get(id).sheet.render(true);
    }

    // Delete the document.
    else if (control === "delete") {
      const id = event.currentTarget.closest("[data-item-id]").dataset.itemId;
      return collection.get(id).deleteDialog();
    }

    // Toggle an ActiveEffect.
    else if (control === "toggle") {
      const data = event.currentTarget.closest("[data-item-id]").dataset;
      const item = collection.get(data.itemId);
      return item.update({disabled: !item.disabled});
    }

    // Toggle favoriting.
    else if (control === "favorite") {
      await this.document.favorite();
      return this.render();
    }
  }

  /**
   * Append a new entry to an array within a fieldset.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {Promise<ItemArtichron>}
   */
  async _onClickAddFieldset(event) {
    const prop = event.currentTarget.closest("FIELDSET").dataset.property;
    const parts = this.document.system.toObject()[prop].concat([{}]);
    return this.document.update({[`system.${prop}`]: parts});
  }

  /**
   * Remove an entry from an array within a fieldset.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {Promise<ItemArtichron>}
   */
  async _onClickDelFieldSet(event) {
    const idx = event.currentTarget.dataset.idx;
    const prop = event.currentTarget.closest("FIELDSET").dataset.property;
    const parts = this.document.system.toObject()[prop];
    parts.splice(idx, 1);
    return this.document.update({[`system.${prop}`]: parts});
  }
}
