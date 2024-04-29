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
        isFavorited: this.document.actor?.system.equipped.favorites.has(this.document) ?? false,
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
        }).sort((a, b) => a.label.localeCompare(b.label)),
        damageTypes: Object.entries(SYSTEM.DAMAGE_TYPES).reduce((acc, [k, v]) => {
          acc[v.group][k] = v.label;
          return acc;
        }, {physical: {}, elemental: {}, planar: {}})
      },
      descriptions: {
        value: await TextEditor.enrichHTML(this.document.system.description.value, {
          rollData: data.rollData, async: true
        })
      }
    });

    if (data.isWeapon) {
      data.context.subtypes = SYSTEM.ARSENAL_TYPES;
    } else if (data.isShield) {
      data.context.subtypes = SYSTEM.SHIELD_TYPES;
    } else if (data.isSpell) {
      data.context.subtypes = SYSTEM.SPELL_TYPES;
    } else if (data.isArmor) {
      data.context.subtypes = SYSTEM.ARMOR_TYPES;
    } else if (data.isElixir) {
      data.context.subtypes = SYSTEM.ELIXIR_TYPES;
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
        case "add": n.addEventListener("click", this._onClickAddDamage.bind(this)); break;
        case "del": n.addEventListener("click", this._onClickDelDamage.bind(this)); break;
      }
    });
    for (const element of html.querySelectorAll("multi-select")) {
      element.addEventListener("change", this._onChangeInput.bind(this));
    }
  }

  /** @override */
  _disableOverriddenFields(html) {
    super._disableOverriddenFields(html);
    if (foundry.utils.hasProperty(this.document.overrides, "system.damage")) {
      html.querySelectorAll("[data-action=add], [data-action=del]").forEach(n => n.remove());
      html.querySelectorAll("[name^='system.damage']").forEach(n => n.disabled = true);
    }
  }

  /**
   * Handle clicking an item control.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {Promise}
   */
  async _onClickManageItem(event) {
    const control = event.currentTarget.dataset.control;
    const collection = this.document.getEmbeddedCollection("effects");

    // Create a new document.
    if (control === "create") {
      return collection.documentClass.implementation.createDialog({
        name: collection.documentClass.implementation.defaultName(),
        img: "icons/svg/sun.svg",
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
  async _onClickAddDamage(event) {
    const type = (this.document.type === "spell") ? "fire" : "physical";
    const parts = this.document.system.toObject().damage.concat([{formula: "", type: type}]);
    return this.document.update({"system.damage": parts});
  }

  /**
   * Remove an entry from an array within a fieldset.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {Promise<ItemArtichron>}
   */
  async _onClickDelDamage(event) {
    const idx = event.currentTarget.dataset.idx;
    const parts = this.document.system.toObject().damage;
    parts.splice(idx, 1);
    return this.document.update({"system.damage": parts});
  }
}
