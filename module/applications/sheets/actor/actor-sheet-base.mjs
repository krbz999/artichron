import ArtichronSheetMixin from "../../api/document-sheet-mixin.mjs";

/**
 * Base actor sheet.
 * @extends {foundry.applications.sheets.ActorSheet}
 */
export default class ActorSheetArtichron extends ArtichronSheetMixin(foundry.applications.sheets.ActorSheet) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["actor"],
    position: { height: 500, width: 400 },
    window: { resizable: true },
    actions: {
      useItem: ActorSheetArtichron.#onUseItem,
      recoverHealth: ActorSheetArtichron.#onRecoverHealth,
      configure: ActorSheetArtichron.#onToggleConfig,
    },
  };

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextEffects(context, options) {
    context.ctx = {
      conditions: [],
      buffs: { active: [], inactive: [] },
    };

    for (const effect of this.document.allApplicableEffects()) {
      const data = { effect, label: effect.name };
      if (effect.parent !== this.document) data.parentId = effect.parent.id;

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

    // Add context menu for items.
    this._createContextMenu(
      this.#getContextOptionsItem,
      ".document-list.items .entry",
      { hookName: "ItemEntryContext" },
    );
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for ActiveEffects.
   * @returns {object[]}
   */
  #getContextOptionsActiveEffect() {
    if (!this.document.isOwner) return [];
    const getEffect = btn => {
      const parentId = btn.dataset.parentId;
      if (parentId) return this.document.items.get(parentId).effects.get(btn.dataset.id);
      return this.document.effects.get(btn.dataset.id);
    };

    return [{
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      callback: btn => getEffect(btn).sheet.render({ force: true }),
      group: "manage",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      condition: btn => getEffect(btn).type !== "condition",
      callback: btn => getEffect(btn).deleteDialog(),
      group: "manage",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.enable",
      icon: "<i class='fa-solid fa-fw fa-toggle-on'></i>",
      condition: btn => (getEffect(btn).type !== "condition") && getEffect(btn).disabled,
      callback: btn => getEffect(btn).update({ disabled: false }),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.disable",
      icon: "<i class='fa-solid fa-fw fa-toggle-off'></i>",
      condition: btn => (getEffect(btn).type !== "condition") && !getEffect(btn).disabled,
      callback: btn => getEffect(btn).update({ disabled: true }),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.removeCondition",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      condition: btn => (getEffect(btn).type === "condition") && !getEffect(btn).system.hasLevels,
      callback: btn => getEffect(btn).delete(),
      group: "manage",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.increaseCondition",
      icon: "<i class='fa-solid fa-fw fa-circle-up'></i>",
      condition: btn => (getEffect(btn).type === "condition") && getEffect(btn).system.canIncrease,
      callback: btn => this.document.toggleStatusEffect(getEffect(btn).system.primary, { active: true }),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.decreaseCondition",
      icon: "<i class='fa-solid fa-fw fa-circle-down'></i>",
      condition: btn => (getEffect(btn).type === "condition") && getEffect(btn).system.canDecrease,
      callback: btn => this.document.toggleStatusEffect(getEffect(btn).system.primary, { active: false }),
      group: "action",
    }];
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for items.
   * @returns {object[]}
   */
  #getContextOptionsItem() {
    if (!this.document.isOwner) return [];
    const getItem = el => this.document.items.get(el.dataset.id);

    return [{
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      callback: el => getItem(el).sheet.render({ force: true }),
      group: "manage",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      callback: el => getItem(el).hasGrantedItems ? getItem(el).advancementDeletionPrompt() : getItem(el).deleteDialog(),
      group: "manage",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.equip",
      icon: "<i class='fa-solid fa-fw fa-shield'></i>",
      condition: el => getItem(el).system.canEquip,
      callback: el => getItem(el).system.equip(),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.unequip",
      icon: "<i class='fa-solid fa-fw fa-shield-halved'></i>",
      condition: el => ["hero", "monster"].includes(this.document.type) && getItem(el).isEquipped,
      callback: el => getItem(el).system.unequip(),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.favorite",
      icon: "<i class='fa-solid fa-fw fa-star'></i>",
      condition: el => ["hero", "monster"].includes(this.document.type) && !getItem(el).isFavorite,
      callback: el => this.document.addFavoriteItem(getItem(el).id),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.unfavorite",
      icon: "<i class='fa-regular fa-fw fa-star'></i>",
      condition: el => ["hero", "monster"].includes(this.document.type) && getItem(el).isFavorite,
      callback: el => this.document.removeFavoriteItem(getItem(el).id),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.fuse",
      icon: "<i class='fa-solid fa-fw fa-volcano'></i>",
      condition: el => ["hero", "monster"].includes(this.document.type) && getItem(el).hasFusions && !getItem(el).isFused,
      callback: el => getItem(el).fuseDialog(),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.unfuse",
      icon: "<i class='fa-solid fa-fw fa-recycle'></i>",
      condition: el => ["hero", "monster"].includes(this.document.type) && getItem(el).isFused,
      callback: el => getItem(el).system.fusion.unfuseDialog(),
      group: "action",
    }];
  }

  /* -------------------------------------------------- */
  /*   Drag and drop handlers                           */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDropFolder(event, folder) {
    if (!this.document.isOwner || (folder.type !== "Item")) return;

    const contents = folder.contents.concat(folder.getSubfolders(true).flatMap(folder => folder.contents));
    for (let item of contents) {
      if (!(item instanceof foundry.documents.Item)) item = await foundry.utils.fromUuid(item.uuid);
      await this._onDropItem(event, item);
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDropItem(event, item) {
    if (!this.document.isOwner) return;

    // Trigger advancements.
    if (item.supportsAdvancements) {
      await artichron.data.pseudoDocuments.advancements.BaseAdvancement.performChanges(this.document, item);
      return;
    }

    // Stack the item.
    if ((item.parent !== this.document) && item.system.identifier && item.system.schema.has("quantity")) {
      const existing = this.document.itemTypes[item.type].find(i => {
        return i.system.identifier === item.system.identifier;
      });
      if (existing) {
        await existing.update({ "system.quantity.value": existing.system.quantity.value + item.system.quantity.value });
        return;
      }
    }

    // Default behavior.
    return super._onDropItem(event, item);
  }

  /* -------------------------------------------------- */
  /*   Event Handlers                                   */
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
      case "pools":
        Cls = artichron.applications.apps.actor.HeroPoolConfig;
        break;
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
    this.document.recover();
  }
}
