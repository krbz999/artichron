const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

export default class WeaponUseDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({item, resolve, ...options} = {}) {
    super(options);
    this.#item = item;
    this.resolve = resolve;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "weapon"],
    tag: "form",
    position: {
      width: 400,
      height: "auto"
    },
    window: {
      icon: "fa-solid fa-hand-fist",
      minimizable: false,
      contentClasses: ["standard-form"]
    },
    form: {
      handler: this._onSubmit,
      closeOnSubmit: true
    }
  };

  /** @override */
  static PARTS = {
    form: {template: "systems/artichron/templates/item/weapon-use-dialog.hbs"},
    footer: {template: "systems/artichron/templates/item/arsenal-use-dialog-footer.hbs"}
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
  get item() {
    return this.#item;
  }
  #item = null;

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
  async _prepareContext(options) {
    const weaponType = this.item.system.category.subtype;
    const ammos = this.item.actor.items.reduce((acc, item) => {
      const isType = CONFIG.SYSTEM.AMMUNITION_TYPES[item.system.category?.subtype]?.weapons.has(weaponType);
      if (isType && item.isAmmo && (item.system.quantity.value > 0)) {
        acc[item.id] = item.name;
      }
      return acc;
    }, {});
    const ammoField = new foundry.data.fields.StringField({
      choices: ammos,
      blank: true,
      label: "ARTICHRON.WeaponUseDialog.Ammunition",
      hint: "ARTICHRON.WeaponUseDialog.AmmunitionHint"
    });

    const value = this.item.actor.system.pools.stamina.value;
    const staminaField = new foundry.data.fields.NumberField({
      min: 0,
      initial: 0,
      max: value,
      step: 1,
      label: "ARTICHRON.WeaponUseDialog.Stamina",
      hint: "ARTICHRON.WeaponUseDialog.StaminaHint"
    });

    const elixirs = this.item.actor.items.reduce((acc, item) => {
      const category = item.system.category;
      const isBooster = (item.type === "elixir") && (category.subtype === "booster") && (category.pool === "stamina");
      if (isBooster && item.hasUses && (item.system.usage.value > 0)) acc[item.id] = item.name;
      return acc;
    }, {});
    const booster = new foundry.data.fields.StringField({
      choices: elixirs,
      label: "ARTICHRON.WeaponUseDialog.BoosterItem",
      hint: "ARTICHRON.WeaponUseDialog.BoosterItemHint"
    });
    const uses = new foundry.data.fields.NumberField({
      min: 0,
      max: 0,
      step: 1,
      initial: 0,
      label: "ARTICHRON.WeaponUseDialog.BoosterUses"
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
      },
      booster: booster,
      uses: uses,
      submitIcon: this.options.window.icon
    };
  }

  /* ---------------------------------------- */
  /*              EVENT HANDLERS              */
  /* ---------------------------------------- */

  /** @override */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    if (event.target.name === "booster") {
      const booster = event.target;
      const uses = this.element.elements.uses;
      uses.disabled = !booster.value;
      if (booster.value) {
        const item = this.item.actor.items.get(booster.value);
        const max = item.system.usage.value;
        for (const k of [uses, ...uses.children]) {
          k.setAttribute("max", max);
          k.value = (uses.value > max) ? 0 : uses.value;
        }
      }
    }
  }

  /**
   * Handle submission of the form.
   */
  static _onSubmit(event, target, formData) {
    if (this.resolve) this.resolve(formData.object);
  }
}
