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
      removeMember: PartySheet.#removeMember
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/shared/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/shared/tabs.hbs"},
    members: {template: "systems/artichron/templates/actor/party-members.hbs"},
    inventory: {template: "systems/artichron/templates/actor/party-inventory.hbs"}
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
      actors: Array.from(this.document.system.members).reduce((acc, m) => {
        if (m.actor) acc.push({actor: m.actor, isOwner: m.actor.isOwner});
        return acc;
      }, [])
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

    return Object.fromEntries(Object.entries(items).sort((a, b) => a[1].order - b[1].order));
  }

  /* -------------------------------------------------- */
  /*   Drag and drop handlers                           */
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
