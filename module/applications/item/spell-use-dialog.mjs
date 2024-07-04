const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

export default class SpellUseDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({item, resolve, ...options} = {}) {
    super(options);
    this.#item = item;
    this.resolve = resolve;
  }

  /* -------------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "spell"],
    tag: "form",
    window: {
      icon: "fa-solid fa-hand-sparkles",
      minimizable: false,
      contentClasses: ["standard-form"]
    },
    position: {
      height: "auto",
      width: 400
    },
    form: {
      handler: this._onConfirm,
      closeOnSubmit: true
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    form: {template: "systems/artichron/templates/item/spell-use-dialog.hbs"},
    options: {template: "systems/artichron/templates/item/spell-use-dialog-options.hbs"},
    footer: {template: "systems/artichron/templates/item/arsenal-use-dialog-footer.hbs"}
  };

  /* -------------------------------------------------- */

  /** @override */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);

    const part = event.target.closest("[data-application-part]").dataset.applicationPart;
    if (part === "form") {
      if (event.target.name === "damage") this.#damage = event.target.value;
      else if (event.target.name === "shape") this.#shape = event.target.value;
      else if (event.target.name === "buff") this.#buff = event.target.value;
      this.render({parts: ["options", "footer"]});
    } else if (part === "options") {
      this.render({parts: ["footer"]});
    }
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.SpellUseDialog.Title", {item: this.item.name});
  }

  /* -------------------------------------------------- */

  /**
   * The spell being used.
   * @type {ItemArtichron}
   */
  get item() {
    return this.#item;
  }
  #item = null;

  /* -------------------------------------------------- */

  /**
   * The chosen shape of the spell.
   * @type {string}
   */
  #shape = null;
  get shape() {
    return this.#shape;
  }

  /* -------------------------------------------------- */

  /**
   * The currently selected damage part.
   * @type {string}
   */
  #damage = null;
  get damage() {
    return this.#damage;
  }

  /* -------------------------------------------------- */

  /**
   * The currently selected buff effect.
   * @type {string}
   */
  #buff = null;
  get buff() {
    return this.#buff;
  }

  /* -------------------------------------------------- */
  /*   Method handling and preparation                  */
  /* -------------------------------------------------- */

  /**
   * Create an async instance of this application.
   * @param {ItemArtichron} item
   */
  static async create(item) {
    return new Promise(resolve => {
      const dialog = new this({item, resolve});
      dialog.addEventListener("close", () => resolve(null), {once: true});
      dialog.render({force: true});
    });
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    return {
      isDamage: this.item.system.category.subtype === "offense",
      isBuff: this.item.system.category.subtype === "buff"
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    if (partId === "form") {
      if (context.isDamage) {

        // Build damage parts.
        const choices = {};
        for (const {id, formula, type} of this.item.system._damages) {
          choices[id] = `${CONFIG.SYSTEM.DAMAGE_TYPES[type].label} [${formula}]`;
        }
        const field = new foundry.data.fields.StringField({
          choices: choices,
          label: "ARTICHRON.SpellUseDialog.Damage",
          blank: false
        });
        context.damage = {field: field, name: "damage", value: this.damage};
      }

      // Build shape choices.
      const types = this.item.system.template.types;
      const choices = {};
      for (const [k, v] of Object.entries(CONFIG.SYSTEM.AREA_TARGET_TYPES)) {
        if (types.has(k)) choices[k] = v.label;
      }
      const field = new foundry.data.fields.StringField({
        choices: choices,
        label: "ARTICHRON.SpellUseDialog.Shape",
        blank: true
      });
      context.shape = {field: field, name: "shape", value: this.shape};

      if (context.isBuff) {

        // Build buff choices.
        const choices = {};
        for (const effect of this.item.effects) {
          if ((effect.type === "buff") && !effect.system.isGranted && !effect.transfer) {
            choices[effect.id] = effect.name;
          }
        }
        const field = new foundry.data.fields.StringField({
          choices: choices,
          label: "ARTICHRON.SpellUseDialog.Buff",
          blank: true
        });
        context.buff = {field: field, name: "buff", value: this.buff};
      }

      const elixirs = this.item.actor.items.reduce((acc, item) => {
        const isBooster = item.isBoostElixir && (item.system.category.pool === "mana");
        if (isBooster && item.hasUses && (item.system.usage.value > 0)) acc[item.id] = item.name;
        return acc;
      }, {});
      const boosters = new foundry.data.fields.SetField(new foundry.data.fields.StringField({
        choices: elixirs
      }), {
        label: "ARTICHRON.SpellUseDialog.Boosters",
        hint: "ARTICHRON.SpellUseDialog.BoostersHint"
      });

      context.boosters = boosters;
    }

    else if (partId === "options") {
      const numField = (name, max) => {
        const field = new foundry.data.fields.NumberField({
          min: 0,
          max: max,
          nullable: true,
          step: 1,
          initial: 0,
          label: "ARTICHRON.SpellUseDialog." + name.capitalize()
        });

        return {field: field, name: name, value: this[name] ?? 0};
      };

      const mana = this.maxMana;
      context.sliders = [];
      for (const k of ["count", "range", "distance", "width", "radius"]) {

        if (CONFIG.SYSTEM.AREA_TARGET_TYPES[this.shape]?.[k]) {
          context.sliders.push(numField(k, mana));
        }
      }
      if (context.isDamage) context.sliders.unshift(numField("additional", mana));
    }

    else if (partId === "footer") {
      context.submitIcon = this.options.window.icon;

      // Disable footer button.
      let state = false;
      if (!this.shape) state = true;
      else if (context.isDamage && !this.damage) state = true;
      else if (context.isBuff && !this.buff) state = true;
      else if (this.cost > this.maxMana) state = true;
      context.disabled = state;
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @override */
  _syncPartState(partId, newEl, oldEl, state) {
    super._syncPartState(partId, newEl, oldEl, state);
    if (partId === "options") {
      for (const k of ["additional", "count", "range", "distance", "width", "radius"]) {
        const selector = `[name=${k}]`;
        const n = newEl.querySelector(selector);
        if (n) {
          const o = oldEl.querySelector(selector);
          if (o) n.value = Math.clamp(o.value, 0, parseInt(n.getAttribute("max")));
        }
      }
    }
  }

  /* -------------------------------------------------- */

  /**
   * Calculate the current cost of the configuration.
   * @type {number}
   */
  get cost() {
    let value = 0;
    const element = this.element.elements;
    for (const k of ["additional", "count", "range", "distance", "width", "radius"]) {
      if (element[k]?.value) value += element[k].value;
    }
    return value;
  }

  /* -------------------------------------------------- */

  /**
   * Calculate the maximum for each range determined by the mana available and any selected boosters.
   * @type {number}
   */
  get maxMana() {
    const mana = this.item.actor.system.pools?.mana.value ?? 0;
    const boosters = this.element?.elements.boosters;
    if (boosters) return mana + boosters.value.length;
    return mana;
  }

  /* -------------------------------------------------- */

  /**
   * Confirm and submit the form, and resolve the promise.
   * @this SpellcastingDialog
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The targeted element.
   */
  static _onConfirm(event, target, formData) {
    const data = formData.object;
    data.cost = this.cost;
    if (this.resolve) this.resolve(data);
  }

  /* -------------------------------------------------- */

  /**
   * Helper method to adjust the spellcasting model's data into template data.
   * @param {object} data
   * @returns {object}
   */
  static determineTemplateData(data) {
    let type;
    let distance;
    let width;
    let attach;
    let angle;
    let range;
    let count = 1;

    const getValue = (d) => {
      const [base, increase] = CONFIG.SYSTEM.AREA_TARGET_TYPES[data.shape][d];
      return base + increase * data[d];
    };

    switch (data.shape) {
      case "single": {
        count = getValue("count");
        range = getValue("range");
        break;
      }
      case "ray": {
        distance = getValue("distance");
        width = getValue("width");
        count = getValue("count");
        attach = true;
        break;
      }
      case "cone": {
        distance = getValue("distance");
        count = getValue("count");
        angle = 45;
        attach = true;
        width = 1;
        break;
      }
      case "circle": {
        distance = getValue("radius");
        range = getValue("range");
        count = getValue("count");
        attach = false;
        break;
      }
      case "radius": {
        distance = getValue("radius");
        attach = true;
        break;
      }
    }

    return {type: data.shape, distance, width, attach, angle, range, count};
  }
}
