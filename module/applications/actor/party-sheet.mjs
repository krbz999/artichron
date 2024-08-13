import ActorSheetArtichron from "./actor-sheet-base.mjs";

export default class PartySheet extends ActorSheetArtichron {
  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["party"],
    position: {width: 650},
    actions: {
      createProgression: PartySheet.#createProgression,
      displayActor: PartySheet.#displayActor,
      removeMember: PartySheet.#removeMember
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/shared/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/shared/tabs.hbs"},
    members: {
      template: "systems/artichron/templates/actor/party-members.hbs",
      scrollable: [""]
    },
    inventory: {
      template: "systems/artichron/templates/actor/party-inventory.hbs",
      scrollable: [""]
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static TABS = {
    members: {id: "members", group: "primary", label: "ARTICHRON.SheetTab.Members"},
    inventory: {id: "inventory", group: "primary", label: "ARTICHRON.SheetTab.Inventory"}
  };

  /* -------------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "members"
  };

  /* -------------------------------------------------- */
  /*   Rendering methods                                */
  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {
      isEditable: this.isEditable,
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode,
      tabs: this._getTabs(),
      document: this.document,
      source: this.document.toObject(),
      items: await this._prepareItems(),
      actors: await this.#prepareMembers()
    };

    const prop = path => {
      if (context.isEditMode) return foundry.utils.getProperty(context.source, path);
      return foundry.utils.getProperty(context.document, path);
    };

    context.header = {
      img: prop("img"),
      name: prop("name")
    };

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the array of members for display.
   * @returns {Promise<object[]>}
   */
  async #prepareMembers() {
    const members = [];

    for (const {actor} of this.document.system.members) {
      if (!actor) continue;
      const context = {
        actor: actor,
        isOwner: actor.isOwner,
        isHero: actor.type === "hero",
        pct: {hp: actor.system.health.pct},
        canView: actor.testUserPermission(game.user, "LIMITED")
      };

      if (context.isHero) {
        context.pct.health = actor.system.pools.health.pct;
        context.pct.stamina = actor.system.pools.stamina.pct;
        context.pct.mana = actor.system.pools.mana.pct;

        context.pts = {
          available: actor.system.progression.points.available,
          total: actor.system.progression.points.total,
          spent: actor.system.progression.points.total - actor.system.progression.points.available
        };
      }

      members.push(context);
    }

    return members;
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareItems() {
    const items = {};

    for (const item of this.document.items) {
      items[item.type] ??= {
        label: game.i18n.localize(`TYPES.Item.${item.type}Pl`),
        order: CONFIG.Item.dataModels[item.type].metadata.order,
        items: []
      };
      items[item.type].items.push(item);
    }

    for (const {items: itemArray} of Object.values(items)) {
      itemArray.sort((a, b) => {
        const sort = a.sort - b.sort;
        if (sort) return sort;
        return a.name.localeCompare(b.name);
      });
    }

    return Object.fromEntries(Object.entries(items).sort((a, b) => {
      return a[1].order - b[1].order;
    }));
  }

  /* -------------------------------------------------- */

  /** @override */
  _canDragStart(selector) {
    return this.isEditable && this.document.isOwner;
  }

  /* -------------------------------------------------- */

  /** @override */
  async _onDrop(event) {
    event.preventDefault();
    const {type, uuid} = TextEditor.getDragEventData(event);
    if (type !== "Actor") return super._onDrop(event);

    const isMembers = this.tabGroups.primary === "members";
    if (!isMembers) return;

    const actor = await fromUuid(uuid);
    if (actor) this.document.system.addMember(actor);
  }

  /* -------------------------------------------------- */

  /** @override */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    for (const {actor} of this.document.system.members) {
      if (actor) actor.apps[this.id] = this;
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  _onClose(options) {
    for (const {actor} of this.document.system.members) {
      if (actor) delete actor.apps[this.id];
    }
    super._onClose(options);
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Prompt to create a progression on a hero actor who is a member of this party.
   * @this {PartySheet}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static #createProgression(event, target) {
    const id = target.closest(".member").dataset.id;
    const actor = game.actors.get(id);
    actor.system.createProgression();
  }

  /* -------------------------------------------------- */

  /**
   * Display an actor when the avatar is clicked.
   * @this {PartySheet}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static #displayActor(event, target) {
    const id = target.closest(".member").dataset.id;
    const actor = game.actors.get(id);
    actor.sheet.render({force: true});
  }

  /* -------------------------------------------------- */

  /**
   * Remove this member from this party.
   * @this {PartySheet}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static #removeMember(event, target) {
    const id = target.closest(".member").dataset.id;
    const actor = game.actors.get(id);
    this.document.system.removeMember(actor);
  }
}
