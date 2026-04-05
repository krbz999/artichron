import ActorSheetArtichron from "./actor-sheet-base.mjs";

export default class MonsterSheet extends ActorSheetArtichron {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["monster"],
    actions: {
      decreaseLoot: MonsterSheet.#onDecreaseLoot,
      grantLoot: MonsterSheet.#grantLoot,
      increaseLoot: MonsterSheet.#onIncreaseLoot,
      removeLoot: MonsterSheet.#onRemoveLoot,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: "systems/artichron/templates/sheets/actor/monster/header.hbs",
    },
    health: {
      template: "systems/artichron/templates/sheets/actor/monster/health.hbs",
      classes: ["health-bar"],
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    actions: {
      template: "systems/artichron/templates/sheets/actor/monster/actions.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    loot: {
      template: "systems/artichron/templates/sheets/actor/monster/loot.hbs",
      scrollable: [""],
    },
    details: {
      template: "systems/artichron/templates/sheets/actor/monster/details.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    effects: {
      template: "systems/artichron/templates/sheets/actor/monster/effects.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "actions", icon: "fa-solid fa-fw fa-clover" },
        { id: "loot", icon: "fa-solid fa-fw fa-boxes" },
        { id: "details", icon: "fa-solid fa-fw fa-pen-fancy" },
        { id: "effects", icon: "fa-solid fa-fw fa-bolt" },
      ],
      labelPrefix: "ARTICHRON.SHEET.TABS",
      initial: "actions",
    },
  };

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextHeader(context, options) {
    const ctx = context.ctx = { defenses: [], damage: {} };

    for (const [k, v] of Object.entries(this.document.system.defenses)) {
      if (!v) continue;
      const { color, img, label } = artichron.config.DAMAGE_TYPES[k];
      ctx.defenses.push({ color, img, label, value: v });
    }

    // Damage.
    const [part] = this.document.system._configureDamageRollConfigs();
    ctx.damage.part = {
      formula: part.parts.join(" + "),
      color: artichron.config.DAMAGE_TYPES[part.damageType]?.color,
      img: artichron.config.DAMAGE_TYPES[part.damageType]?.img,
    };

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextHealth(context, options) {
    context.ctx = {};
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextActions(context, options) {
    context.ctx = {
      favorites: [],
      inventory: [],
    };

    // Favorites
    for (const item of this.document.favorites) {
      context.ctx.favorites.push({ document: item, classes: ["draggable"] });
    }

    // Inventory
    for (const item of this.document.items) {
      context.ctx.inventory.push({ document: item, classes: ["draggable"] });
    }
    context.ctx.inventory.sort((a, b) => artichron.utils.nameSort(a, b, "document"));

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextLoot(context, options) {
    context.ctx = {
      loot: this.document.system.lootDrops,
    };
    context.ctx.loot.sort((a, b) => a.item.name.localeCompare(b.item.name));
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDetails(context, options) {
    context.ctx = {
      bio: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.document.system.biography.value,
        { relativeTo: this.document, rollData: this.document.getRollData() },
      ),
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _preSyncPartState(p, ne, pe, s) {
    super._preSyncPartState(p, ne, pe, s);

    if (p === "health") {
      const o = pe.querySelector(".health-fill");
      s.healthHeight = Math.max(o.offsetTop, 0);
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "health") {
      if (!("healthHeight" in state)) return;
      const newBar = newElement.querySelector(".health-fill");
      const n = Math.max(newBar.offsetTop, 0);
      if (state.healthHeight === n) return;
      const frames = [{ top: `${state.healthHeight}px` }, { top: `${n}px` }];
      newBar.animate(frames, { duration: 1000, easing: "ease-in-out" });
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDropItem(event, item) {
    if (!this.document.isOwner) return;
    if (this.tabGroups.primary !== "loot") return super._onDropItem(event, item);
    if (document.isEmbedded) return;
    await this.document.system.addLootDrop(item.uuid, item.system.quantity?.value ?? 1);
  }

  /* -------------------------------------------------- */

  /**
   * Remove a loot entry.
   * @this {MonsterSheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #onRemoveLoot(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    this.document.system.removeLootDrop(uuid);
  }

  /* -------------------------------------------------- */

  /**
   * Increase the quantity of a loot entry.
   * @this {MonsterSheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #onIncreaseLoot(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    this.document.system.adjustLootDrop(uuid, 1);
  }

  /* -------------------------------------------------- */

  /**
   * Decrease the quantity of a loot entry.
   * @this {MonsterSheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #onDecreaseLoot(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    this.document.system.adjustLootDrop(uuid, -1);
  }

  /* -------------------------------------------------- */

  /**
   * Grant the loot of this monster to the primary party.
   * @this {MonsterSheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #grantLoot(event, target) {
    target.disabled = true;

    const confirm = await artichron.applications.api.Dialog.confirm({
      content: game.i18n.format("ARTICHRON.LootDialog.Content", { name: this.document.name }),
      window: {
        title: game.i18n.format("ARTICHRON.LootDialog.Title", { name: this.document.name }),
        icon: "fa-solid fa-box-open",
      },
    });
    if (!confirm) {
      target.disabled = false;
      return;
    }

    this.document.system.grantLootDrops();
  }
}
