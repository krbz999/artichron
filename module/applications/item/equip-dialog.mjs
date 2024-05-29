const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

export default class EquipDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "equipped"],
    tag: "dialog",
    modal: true,
    window: {
      title: "ARTICHRON.EquipDialog.Title",
      icon: "fa-solid fa-hand-fist",
      minimizable: false
    },
    position: {width: 350, height: "auto"},
    actions: {
      itemButton: this._onItemButton
    }
  };

  /** @override */
  static PARTS = {
    selections: {template: "systems/artichron/templates/item/equip-dialog-selections.hbs"}
  };

  constructor({actor, slot, ...options}) {
    super(options);
    this.#actor = actor;
    this.#slot = slot;
  }

  /**
   * The actor changing their equipment.
   * @type {ActorArtichron}
   */
  #actor = null;
  get actor() {
    return this.#actor;
  }

  /**
   * The targeted slot that is having its equipped item changed.
   * @type {string}
   */
  #slot = null;
  get slot() {
    return this.#slot;
  }

  /**
   * Is this armor or arsenal?
   * @type {string}
   */
  get type() {
    if (["primary", "secondary"].includes(this.slot)) return "arsenal";
    return "armor";
  }

  /* ---------------------------------------- */
  /*                Rendering                 */
  /* ---------------------------------------- */

  /** @override */
  _onFirstRender(_context, _options) {
    if (this.options.modal) this.element.showModal();
    else this.element.show();
  }

  /** @override */
  async _prepareContext(options) {
    const context = {};

    let items;
    let icon;

    if (this.type === "armor") {
      items = this.actor.items.filter(item => (item.type === "armor") && (item.system.category.subtype === this.slot));
      icon = "fa-solid fa-shield-alt";
    } else {
      items = this.actor.items.filter(item => {
        if (!item.isArsenal) return false;
        const {primary, secondary} = this.actor.arsenal;
        if (this.slot === "primary") return !secondary || (secondary !== item);
        if (this.slot === "secondary") return (!primary || (primary !== item)) && item.isOneHanded;
      });
      icon = "fa-solid fa-hand-fist";
    }

    const currentItem = this.actor.system.equipped[this.type][this.slot];
    context.buttons = items.map(item => {
      return {
        itemId: item.id,
        unequip: item === currentItem,
        img: item.img,
        name: item.name
      };
    });

    return context;
  }

  /* ---------------------------------------- */
  /*              EVENT HANDLERS              */
  /* ---------------------------------------- */

  /**
   * Close the dialog and change the equipped item.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      Current target of the event.
   */
  static _onItemButton(event, target) {
    const id = target.dataset.itemId;
    const item = this.actor.items.get(id);
    const current = this.actor.system.equipped[this.type][this.slot];
    const value = (id === current?.id) ? null : id;
    const update = {[`system.equipped.${this.type}.${this.slot}`]: value};
    if ((this.type === "arsenal") && (this.slot === "primary") && !(id === current?.id) && item.isTwoHanded) {
      update["system.equipped.arsenal.secondary"] = null;
    }
    this.close();
    this.actor.update(update);
  }
}
