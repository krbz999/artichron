const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

export default class WeaponUseDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({item, resolve, ...options} = {}) {
    super(options);
    this.item = item;
    this.resolve = resolve;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "weapon"],
    tag: "form",
    window: {
      icon: "fa-solid fa-hand-fist",
      minimizable: false
    },
    form: {
      handler: this._onSubmit,
      closeOnSubmit: true
    }
  };

  /** @override */
  static PARTS = {
    form: {template: "systems/artichron/templates/item/weapon-use-dialog.hbs"},
    footer: {template: "systems/artichron/templates/item/weapon-use-dialog-footer.hbs"}
  };

  /* ---------------------------------------- */
  /*                PROPERTIES                */
  /* ---------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.WeaponUseDialog.Title", {name: this.item.name});
  }

  /**
   * The weapon being used to attack.
   * @type {ItemArtichron}
   */
  #item = null;

  get item() {
    return this.#item;
  }

  set item(item) {
    if (item instanceof Item) this.#item = item;
  }

  /**
   * The amount of stamina the user is wanting to spend.
   * @type {number}
   */
  #stamina = null;

  get stamina() {
    return this.#stamina;
  }

  set stamina(number) {
    number = Number(number);
    if (Number.isInteger(number) && (number >= 0)) this.#stamina = number;
    else if (number === null) this.#stamina = number;
  }

  /**
   * The ammo that will be applied to this attack.
   * @type {ItemArtichron}
   */
  #ammo = null;

  get ammo() {
    return this.#ammo;
  }

  set ammo(item) {
    if (item === null) this.#ammo = null;
    else if (item instanceof Item) this.#ammo = item;
    else if (typeof item === "string") {
      item = this.item.actor.items.get(item);
      if (item) this.#ammo = item;
    }
  }

  /* ---------------------------------------- */
  /*     Method Handling and Preparation      */
  /* ---------------------------------------- */

  /**
   * Factory method for asynchronous handling.
   * @param {ItemArtichron} item      The item being used.
   * @returns {Promise}
   */
  static async create(item) {
    return new Promise(resolve => {
      const dialog = new this({item, resolve});
      dialog.addEventListener("close", () => resolve(null), {once: true});
      dialog.render({force: true});
    });
  }

  /** @override */
  _onRender(...T) {
    super._onRender(...T);

    this.element.querySelectorAll("[data-change]").forEach(n => {
      n.addEventListener("change", this._onChangeProperty.bind(this));
    });
  }

  /** @override */
  async _prepareContext(options) {
    const ammos = this.item.actor.items.reduce((acc, item) => {
      if (item.isAmmo) acc[item.id] = item.name;
      return acc;
    }, {});
    const ammoField = new foundry.data.fields.StringField({
      choices: ammos,
      blank: true,
      label: "ARTICHRON.WeaponUseDialog.Ammunition",
      name: "ammo"
    });

    const value = this.item.actor.system.pools.stamina.value;
    const staminaField = new foundry.data.fields.NumberField({
      min: 0,
      nullable: true,
      max: value,
      step: 1,
      label: "ARTICHRON.WeaponUseDialog.Stamina",
      name: "stamina"
    });

    return {
      ammo: {
        field: ammoField,
        dataset: {change: "ammo"},
        show: !foundry.utils.isEmpty(ammos)
      },
      stamina: {
        field: staminaField,
        dataset: {change: "stamina"},
        show: value > 0
      }
    };
  }

  /* ---------------------------------------- */
  /*              EVENT HANDLERS              */
  /* ---------------------------------------- */

  /**
   * Handle submission of the form.
   */
  static _onSubmit() {
    const data = {
      stamina: this.stamina,
      ammo: this.ammo
    };

    if (this.resolve) this.resolve(data);
  }

  /**
   * Handle changes to an input.
   * @param {Event} event     The initiating change event.
   */
  _onChangeProperty(event) {
    const name = event.currentTarget.name;
    this[name] = event.currentTarget.value;
  }
}
