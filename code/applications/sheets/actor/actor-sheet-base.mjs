import PseudoDocument from "../../../data/pseudo-documents/pseudo-document.mjs";
import ArtichronSheetMixin from "../../api/document-sheet-mixin.mjs";

/**
 * Base actor sheet.
 * @extends {foundry.applications.sheets.ActorSheet}
 */
export default class ActorSheetArtichron extends ArtichronSheetMixin(foundry.applications.sheets.ActorSheet) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["actor"],
    position: {
      height: 1000,
      width: 600,
    },
    window: {
      resizable: true,
    },
    actions: {
      configure: ActorSheetArtichron.#onToggleConfig,
      recoverHealth: ActorSheetArtichron.#onRecoverHealth,
      rollDamage: ActorSheetArtichron.#rollDamage,
      useItem: ActorSheetArtichron.#onUseItem,
    },
  };

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextEffects(context, options) {
    context.ctx = {
      conditions: [],
      buffs: { active: [], inactive: [] },
    };

    for (const effect of this.document.allApplicableEffects()) {
      const data = { document: effect, label: effect.name, classes: [] };

      if (effect.disabled) data.classes.push("inactive");

      if (effect.parent !== this.document) data.parentId = effect.parent.id;
      else data.classes.push("draggable");

      if (effect.type === "condition") {
        if (effect.system.hasLevels) data.label = `${effect.name} (${artichron.utils.romanize(effect.system.level)})`;
        context.ctx.conditions.push(data);
      } else if ((effect.type === "buff") && effect.disabled) context.ctx.buffs.inactive.push(data);
      else if (effect.type === "buff") context.ctx.buffs.active.push(data);
    }

    return context;
  }

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

    // Add context menu for items and equipped items.
    this._createContextMenu(
      this.#getContextOptionsItem,
      ".document-list.items .entry, .equipment [data-id]",
      { hookName: "ItemEntryContext" },
    );
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for ActiveEffects.
   * @returns {ContextMenuEntry[]}
   */
  #getContextOptionsActiveEffect() {
    if (!this.document.isOwner) return [];
    const getEffect = btn => {
      const parentId = btn.dataset.parentId;
      if (parentId) return this.document.items.get(parentId).effects.get(btn.dataset.id);
      return this.document.effects.get(btn.dataset.id);
    };

    return [{
      label: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.render",
      icon: "fa-solid fa-edit",
      onClick: (event, target) => getEffect(target).sheet.render({ force: true }),
      group: "manage",
    }, {
      label: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.delete",
      icon: "fa-solid fa-trash",
      visible: (target) => (getEffect(target).type !== "condition") && (getEffect(target).parent.documentName !== "Item"),
      onClick: (event, target) => getEffect(target).deleteDialog(),
      group: "manage",
    }, {
      label: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.enable",
      icon: "fa-solid fa-toggle-on",
      visible: (target) => (getEffect(target).type !== "condition") && getEffect(target).disabled,
      onClick: (event, target) => getEffect(target).update({ disabled: false }),
      group: "action",
    }, {
      label: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.disable",
      icon: "fa-solid fa-toggle-off",
      visible: (target) => (getEffect(target).type !== "condition") && !getEffect(target).disabled,
      onClick: (event, target) => getEffect(target).update({ disabled: true }),
      group: "action",
    }, {
      label: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.removeCondition",
      icon: "fa-solid fa-trash",
      visible: (target) => (getEffect(target).type === "condition") && !getEffect(target).system.hasLevels,
      onClick: (event, target) => getEffect(target).delete(),
      group: "manage",
    }, {
      label: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.increaseCondition",
      icon: "fa-solid fa-circle-up",
      visible: (target) => (getEffect(target).type === "condition") && getEffect(target).system.canIncrease,
      onClick: (event, target) => this.document.toggleStatusEffect(getEffect(target).system.primary, { active: true }),
      group: "action",
    }, {
      label: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.decreaseCondition",
      icon: "fa-solid fa-circle-down",
      visible: (target) => (getEffect(target).type === "condition") && getEffect(target).system.canDecrease,
      onClick: (event, target) => this.document.toggleStatusEffect(getEffect(target).system.primary, { active: false }),
      group: "action",
    }];
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for items.
   * @returns {ContextMenuEntry[]}
   */
  #getContextOptionsItem() {
    if (!this.isEditable) return [];
    const getItem = target => this.document.items.get(target.dataset.id);

    // Render and delete.
    const options = [{
      label: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.render",
      icon: "fa-solid fa-edit",
      onClick: (event, target) => getItem(target).sheet.render({ force: true }),
      group: "manage",
    }, {
      label: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.delete",
      icon: "fa-solid fa-trash",
      onClick: (event, target) => {
        const item = getItem(target);
        if (item.hasGrantedItems) item.advancementDeletionPrompt();
        else item.deleteDialog();
      },
      group: "manage",
    }];

    // Favoriting.
    if (["hero", "monster"].includes(this.document.type)) {
      options.push({
        label: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.favorite",
        icon: "fa-solid fa-star",
        visible: (target) => !getItem(target).isFavorite,
        onClick: (event, target) => this.document.addFavoriteItem(getItem(target).id),
        group: "action",
      }, {
        label: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.unfavorite",
        icon: "fa-regular fa-star",
        visible: (target) => getItem(target).isFavorite,
        onClick: (event, target) => this.document.removeFavoriteItem(getItem(target).id),
        group: "action",
      });
    }

    // Equip, unequip, and fuse.
    if (this.document.type === "hero") {
      options.push({
        label: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.equip",
        icon: "fa-solid fa-shield",
        visible: (target) => (getItem(target).type === "armor") && !getItem(target).system.isEquipped,
        onClick: (event, target) => getItem(target).system.equip(),
        group: "action",
      }, {
        label: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.unequip",
        icon: "fa-solid fa-shield-halved",
        visible: (target) => (getItem(target).type === "armor") && getItem(target).system.isEquipped,
        onClick: (event, target) => getItem(target).system.unequip(),
        group: "action",
      }, {
        label: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.fuse",
        icon: "fa-solid fa-volcano",
        visible: (target) => (getItem(target).type === "spell"),
        onClick: (event, target) => getItem(target).system.fuseDialog(),
        group: "action",
      });
    }

    return options;
  }

  /* -------------------------------------------------- */
  /*   Drag and drop handlers                           */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  _canDragStart(selector) {
    return true;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _canDragDrop(selector) {
    return this.isEditable;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDragStart(event) {
    if ("link" in event.target.dataset) return;
    const target = event.currentTarget;
    const isPseudo = !!target.closest("[data-pseudo-id]");
    const document = isPseudo ? this._getPseudoDocument(target) : this._getEmbeddedDocument(target);
    if (!document) return;
    event.dataTransfer.setData("text/plain", JSON.stringify(document.toDragData()));
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const allowed = Hooks.call("dropActorSheetData", this.document, this, data);
    if (allowed === false) return;

    // Dropped documents.
    const documentClass = foundry.utils.getDocumentClass(data.type);
    if (documentClass) {
      const document = await documentClass.fromDropData(data);
      await this._onDropDocument(event, document);
    }

    // Dropped pseudo-documents.
    else {
      const document = await fromUuid(data.uuid);
      if (document instanceof PseudoDocument) await this._onDropPseudoDocument(event, document);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Handle a dropped pseudo-document on the sheet.
   * @param {DragEvent} event                                     The initiating drop event.
   * @param {PseudoDocument} document                             The dropped pseudo-document.
   * @returns {Promise<foundry.documents.Item|null|undefined>}    A promise that resolves to the updated item, if a
   *                                                              pseudo-document was created, otherwise a nullish value.
   */
  async _onDropPseudoDocument(event, document) {
    if (!this.isEditable) return;
    const collection = this.document.getEmbeddedPseudoDocumentCollection(document.documentName);
    if (!collection) return null;

    // Pseudo-document already belonged to this.
    if (document.document === this.document) return null;

    const keepId = !collection.has(document.id);
    const result = await document.constructor.create(document.toObject(), {
      parent: this.document, keepId, renderSheet: false,
    });
    return result ?? null;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDropFolder(event, folder) {
    if (!this.document.isOwner || (folder.type !== "Item")) return;

    const contents = folder.contents.concat(folder.getSubfolders(true).flatMap(folder => folder.contents));
    for (let item of contents) {
      if (!(item instanceof foundry.documents.Item)) item = await foundry.utils.fromUuid(item.uuid);
      await this._onDropItem(event, item);
    }

    return folder;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDropItem(event, item) {
    if (!this.document.isOwner || (item.type === "path")) return;

    // Stack the item.
    if ((item.parent !== this.document) && item.system.identifier && item.system.schema.has("quantity")) {
      const existing = this.document.itemTypes[item.type].find(i => {
        return i.system.identifier === item.system.identifier;
      });
      if (existing) {
        return existing.update({ "system.quantity.value": existing.system.quantity.value + item.system.quantity.value });
      }
    }

    // Default behavior.
    return super._onDropItem(event, item);
  }

  /* -------------------------------------------------- */
  /*   Event Handlers                                   */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  _processFormData(event, form, formData) {
    formData = super._processFormData(event, form, formData);
    if ("value" in (formData.system?.health ?? {})) {
      formData.system.health.spent = this.document.system.health.max - Number(formData.system.health.value);
    }
    return formData;
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to use an item.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #onUseItem(event, target) {
    const item = this._getEmbeddedDocument(target);
    item.use({}, { event: event }, {});
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to render a configuration menu.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #onToggleConfig(event, target) {
    let Cls;
    let options;
    switch (target.dataset.config) {
      case "damage": Cls = artichron.applications.apps.actor.configs.DamageConfig; break;
      case "skill":
        Cls = artichron.applications.apps.actor.configs.SkillConfig;
        options = { skill: target.dataset.skillId };
        break;
    }
    const application = new Cls({ document: this.document, ...options });
    if (foundry.applications.instances.get(application.id)) return;
    application.render({ force: true });
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to restore the actor's hit points and other resources.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #onRecoverHealth(event, target) {
    this.document.system.recover();
  }

  /* -------------------------------------------------- */

  /**
   * Roll damage.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #rollDamage(event, target) {
    this.document.system.rollDamage({ event });
  }
}
