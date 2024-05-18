const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

export default class SpellUseDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({item, resolve, ...options} = {}) {
    super(options);
    this.item = item;
    this.resolve = resolve;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "spell"],
    tag: "form",
    window: {
      icon: "fa-solid fa-hand-sparkles",
      minimizable: false
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

  /** @override */
  static PARTS = {
    form: {template: "systems/artichron/templates/item/spell-use-dialog.hbs"}
  };

  /* ---------------------------------------- */
  /*                PROPERTIES                */
  /* ---------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.SpellUseDialog.Title", {item: this.item.name});
  }

  /**
   * The spell being used.
   * @type {ItemArtichron}
   */
  #item = null;
  get item() {
    return this.#item;
  }
  set item(item) {
    if ((item instanceof Item) && (item.type === "spell")) this.#item = item;
  }

  /**
   * The chosen shape of the spell.
   * @type {string}
   */
  #shape = null;
  get shape() {
    return this.#shape;
  }
  set shape(shape) {
    if (!shape) this.#shape = null;
    else if (this.item.system.template.types.has(shape)) this.#shape = shape;
  }

  /**
   * The number of additional templates that will be placed, or number of single targets.
   * @type {number}
   */
  #count = null;
  get count() {
    return this.#count;
  }
  set count(count) {
    if (Number.isInteger(count) && (count >= 0)) this.#count = count;
  }

  /**
   * The bonus range of the spell.
   * @type {number}
   */
  #range = null;
  get range() {
    return this.#range;
  }
  set range(range) {
    if (Number.isInteger(range) && (range >= 0)) this.#range = range;
  }

  /**
   * The bonus distance of the spell.
   * @type {number}
   */
  #distance = null;
  get distance() {
    return this.#distance;
  }
  set distance(dist) {
    if (Number.isInteger(dist) && (dist >= 0)) this.#distance = dist;
  }

  /**
   * The bonus width of the spell.
   * @type {number}
   */
  #width = null;
  get width() {
    return this.#width;
  }
  set width(w) {
    if (Number.isInteger(w) && (w >= 0)) this.#width = w;
  }

  /**
   * The bonus radius of the spell.
   * @type {number}
   */
  #radius = null;
  get radius() {
    return this.#radius;
  }
  set radius(r) {
    if (Number.isInteger(r) && (r >= 0)) this.#radius = r;
  }

  /**
   * The damage multiplier of the spell.
   * @type {number}
   */
  #multiplier = null;
  get multiplier() {
    return this.#multiplier;
  }
  set multiplier(m) {
    if (Number.isInteger(m) && (m >= 0)) this.#multiplier = m;
  }

  /**
   * The currently selected damage part.
   * @type {string}
   */
  #damage = null;
  get damage() {
    return this.#damage;
  }
  set damage(id) {
    if (this.item.system._damages.some(k => k.id === id)) this.#damage = id;
  }

  /**
   * The currently selected buff effect.
   * @type {string}
   */
  #buff = null;
  get buff() {
    return this.#buff;
  }
  set buff(id) {
    const effect = this.item.effects.get(id);
    if (effect && (effect.type === "buff") && !effect.system.isGranted && !effect.transfer) {
      this.#buff = id;
    }
  }

  /* ---------------------------------------- */
  /*     Method Handling and Preparation      */
  /* ---------------------------------------- */

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

  /** @override */
  async _prepareContext(options) {

    const numField = (name, max) => {
      const field = new foundry.data.fields.NumberField({
        min: 0,
        max: max,
        nullable: true,
        step: 1,
        label: "ARTICHRON.SpellUseDialog." + name.capitalize()
      });

      return {field: field, name: name, value: this[name] ?? 0};
    };

    const mana = this.item.actor.system.pools.mana.value;

    const context = {
      count: numField("count", mana),
      range: numField("range", mana),
      distance: numField("distance", mana),
      width: numField("width", mana),
      radius: numField("radius", mana)
    };

    // Build shape choices.
    const types = this.item.system.template.types;
    const choices = {};
    for (const [k, v] of Object.entries(CONFIG.SYSTEM.SPELL_TARGET_TYPES)) {
      if (types.has(k)) choices[k] = v.label;
    }
    const field = new foundry.data.fields.StringField({
      choices: choices,
      label: "ARTICHRON.SpellUseDialog.Shape",
      blank: true
    });
    context.shape = {field: field, name: "shape", value: this.shape};

    if (this.item.system.category.subtype === "offense") {
      context.isDamage = true;
      context.multiplier = numField("multiplier", mana);

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

    if (this.item.system.category.subtype === "buff") {
      context.isBuff = true;

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

    return context;
  }

  /**
   * Handle change events.
   * @param {Event} event     Initiating change events.
   */
  _onChange(event) {
    const {name, value, dtype} = event.currentTarget;
    this[name] = (dtype === "Number") ? parseInt(value) : value;

    this.element.querySelector("button[type=submit]").disabled = !this._testValidity();

    if (name === "shape") this._toggleHiddenStates(value);
  }

  _testValidity() {
    if (!this.shape) return false;

    if ((this.item.system.category.subtype === "offense") && !this.damage) return false;
    else if ((this.item.system.category.subtype === "buff") && !this.buff) return false;

    return this.cost <= this.item.actor.system.pools.mana.value;
  }

  /**
   * Calculate the current cost of the configuration.
   * @type {number|null}
   */
  get cost() {
    let value = 0;

    const shapeConfig = CONFIG.SYSTEM.SPELL_TARGET_TYPES[this.shape];
    if (!shapeConfig) return null;

    for (const k of ["count", "range", "distance", "width", "radius"]) {
      if (!(k in shapeConfig)) continue;
      value += this[k];
    }

    if (this.item.system.category.subtype === "offense") {
      value += this.multiplier;
    }

    return value;
  }

  _toggleHiddenStates() {
    const shapeConfig = CONFIG.SYSTEM.SPELL_TARGET_TYPES[this.shape] ?? {};
    const names = ["count", "range", "distance", "width", "radius"];
    for (const name of names) {
      const element = this.element.querySelector(`[name="${name}"]`).closest(".form-group");
      element.style.display = (name in shapeConfig) ? "" : "none";
    }
  }

  /**
   * Confirm and submit the form, and resolve the promise.
   * @this SpellcastingDialog
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The targeted element.
   */
  static _onConfirm(event, target) {
    const data = new FormDataExtended(this.element).object;
    data.cost = this.cost;
    if (this.resolve) this.resolve(data);
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll("[name]").forEach(n => {
      n.addEventListener("change", this._onChange.bind(this));
    });
    this._toggleHiddenStates();
  }

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
      const [base, increase] = CONFIG.SYSTEM.SPELL_TARGET_TYPES[data.shape][d];
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
      case "cone":
      case "tee": {
        distance = getValue("distance");
        count = getValue("count");
        angle = 45;
        attach = true;
        width = 1;
        break;
      }
      case "circle":
      case "star": {
        distance = getValue("radius");
        range = getValue("range");
        count = getValue("count");
        attach = false;
        break;
      }
      case "radius":
      case "bang": {
        distance = getValue("radius");
        attach = true;
        break;
      }
    }

    return {type: data.shape, distance, width, attach, angle, range, count};
  }
}
