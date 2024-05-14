const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

export default class SpellcastingDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "spellcasting-dialog"],
    tag: "form",
    position: {
      height: "auto",
      width: 400
    },
    form: {
      handler: this.#onConfirm
    }
  };

  /** @override */
  static PARTS = {
    form: {
      id: "form",
      template: "systems/artichron/templates/chat/spellcasting-dialog.hbs"
    }
  };

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.SpellcastingDialog.Title", {item: this.item.name});
  }

  /**
   * Create an async instance of this application.
   * @param {ActorArtichron} actor
   * @param {ItemArtichron} item
   * @param {object} [options]
   */
  static async create({actor, item, ...options} = {}) {
    return new Promise(resolve => {
      new this({actor, item, ...options, resolve: resolve}).render({force: true});
    });
  }

  /** @constructor */
  constructor({actor, item, resolve, ...options} = {}) {
    super(options);
    this.actor = actor;
    this.item = item;
    this.resolve = resolve;
  }

  /**
   * The actor that is casting a spell.
   * @type {ActorArtichron}
   */
  actor = null;

  /**
   * The item that is being used to cast the spell.
   * @type {ItemArtichron}
   */
  item = null;

  /**
   * The resolve for async application.
   * @type {function}
   */
  resolve = null;

  /**
   * The maximum mana that can be spent.
   * @type {number}
   */
  get max() {
    return this.actor.system.pools.mana.value;
  }

  /**
   * Is this spell configuration for an offensive spell?
   * @type {boolean}
   */
  get isDamage() {
    return !!this.options.damage;
  }

  /**
   * Is this spell configuration for a buff spell?
   * @type {boolean}
   */
  get isBuff() {
    return !!this.options.isBuff;
  }

  /** @override */
  async close(...args) {
    this.resolve?.(null);
    return super.close(...args);
  }

  /** @override */
  async _prepareContext(options) {
    const dtypeOptions = this._getDamageOptions();
    const shapeOptions = this._getShapeOptions();

    const scales = CONFIG.SYSTEM.SPELL_TARGET_TYPES[this.model.shape]?.scale ?? new Set();

    return {
      dtypeOptions: dtypeOptions,
      shapeOptions: shapeOptions,
      model: this.model,
      invalid: ((this.cost > this.max) && this.model.mana) || !scales.size,
      damageOptions: this.isDamage ? this._getManaOptions("damage") : {},
      countOptions: scales.has("count") ? this._getManaOptions("count") : null,
      distanceOptions: scales.has("distance") ? this._getManaOptions("distance") : null,
      widthOptions: scales.has("width") ? this._getManaOptions("width") : null,
      rangeOptions: scales.has("range") ? this._getManaOptions("range") : null,
      radiusOptions: scales.has("radius") ? this._getManaOptions("radius") : null,
      formula: this.isDamage ? this.formula : "",
      label: this._getLabel(),
      noscales: !scales.size,
      cost: this.cost,
      isDamage: this.isDamage,

      isBuff: this.isBuff,
      buffOptions: this.isBuff ? this._getBuffOptions() : {}
    };
  }

  _getBuffOptions() {
    const effects = {};
    for (const effect of this.item.effects) {
      if ((effect.type === "buff") && !effect.system.isGranted && !effect.transfer) {
        effects[effect.id] = effect.name;
      }
    }
    return effects;
  }

  /**
   * Get the displayed label.
   * @returns {string}
   */
  _getLabel() {
    const data = this.constructor.determineTemplateData(this.model.toObject());
    let label;
    if (this.model.shape === "single") {
      label = `${this.model.scale.count + 1} target(s), ${data.range}m range`;
    } else if (this.model.shape === "ray") {
      label = `${data.distance}m line, ${data.width}m wide`;
    } else if (this.model.shape === "cone") {
      label = `${data.distance}m cone`;
    } else if (this.model.shape === "circle") {
      label = `${data.distance}m circle, range up to ${data.range}m`;
    } else if (this.model.shape === "radius") {
      label = `${data.distance}m radius from caster`;
    }
    if (!label) return "";

    if (this.isDamage) {
      const part = this.item.system.damage[this.model.part];
      const dtype = game.i18n.localize(CONFIG.SYSTEM.DAMAGE_TYPES[part.type].label);
      return `${this.formula} ${dtype} damage; ${label}`;
    } else {
      return label;
    }
  }

  /**
   * Get the damage type options.
   * @returns {object}
   */
  _getDamageOptions() {
    if (!this.isDamage) return {};
    const options = this.item.system.damage.map((damage, i) => {
      const obj = CONFIG.SYSTEM.DAMAGE_TYPES[damage.type];
      const label = `${game.i18n.localize(obj.label)} [${damage.formula}]`;
      return [i, {label: label}];
    });
    return Object.fromEntries(options);
  }

  /**
   * Get the shape or type options.
   * @returns {object}
   */
  _getShapeOptions() {
    return Object.entries(CONFIG.SYSTEM.SPELL_TARGET_TYPES).reduce((acc, [k, v]) => {
      if (!this.item.system.template.types.has(k)) return acc;
      acc[k] = {...v, label: `${game.i18n.localize(v.label)} ${v.modifier ? `[${v.modifier}]` : ""}`};
      return acc;
    }, {});
  }

  /**
   * Get the mana options for a scaling property.
   * @param {string} scale      The property that is scaling.
   * @returns {object}
   */
  _getManaOptions(scale) {
    let label;
    if (scale === "damage") {
      const rollData = this.item.getRollData();
      label = (n) => {
        const damage = this.item.system.damage[this.model.part];
        const roll = new Roll(damage.formula, rollData, {type: damage.type});
        const formula = roll.alter(n, 0).formula;
        return `+${formula}`;
      };
    }
    else if (scale === "count") label = (n) => `+${n}`;
    else label = (n) => `+${CONFIG.SYSTEM.SPELL_TARGET_TYPES[this.model.shape][scale][1] * n}m`;
    return Object.fromEntries(Array.fromRange(this.max, 1).map(n => [n, `${label(n)} [${n}/${this.max}]`]));
  }

  /**
   * Custom model for holding form data.
   * @type {DataModel}
   */
  get model() {
    const types = this.item.system.template.types;
    if (this._model) {
      const type = this._model.shape;
      if (!types.has(type)) this._model.updateSource({shape: types.first() || ""});
      return this._model;
    }

    const {SchemaField, NumberField, StringField, BooleanField} = foundry.data.fields;
    const options = {integer: true, min: 0};
    const app = this;

    this._model = new (class SpellcastingModel extends foundry.abstract.DataModel {
      static defineSchema() {
        const schema = {
          scale: new SchemaField({
            count: new NumberField({...options}),
            distance: new NumberField({...options}),
            width: new NumberField({...options}),
            range: new NumberField({...options}),
            radius: new NumberField({...options}),
            damage: new NumberField({...options})
          }),
          part: new NumberField({...options, initial: 0}),
          shape: new StringField({required: true, initial: types.first()}),
          mana: new BooleanField({initial: true}),
          effectId: new StringField({required: true})
        };
        if (!app.isDamage) delete schema.scale.damage;
        if (!app.isBuff) delete schema.effectId;
        return schema;
      }
    })();

    return this._model;
  }

  /**
   * The current mana cost of the spell being sculpted.
   * @type {number}
   */
  get cost() {
    const spellType = CONFIG.SYSTEM.SPELL_TARGET_TYPES[this.model.shape];
    return spellType?.scale.reduce((acc, k) => acc + this.model.scale[k], this.model.scale.damage || 0) ?? 0;
  }

  /**
   * Get the current formula depending on choices made.
   * @type {string}
   */
  get formula() {
    if (!this.model.shape) return "";
    const damage = this.item.system.damage[this.model.part];
    const c = CONFIG.SYSTEM.SPELL_TARGET_TYPES[this.model.shape];
    const formula = `${damage.formula}${c.modifier}`;
    const roll = new Roll(formula, this.item.getRollData(), {type: damage.type}).alter(1 + this.model.scale.damage, 0);
    return roll.formula;
  }

  /**
   * Handle change events select elements.
   * @param {Event} event     Initiating change events.
   */
  #onChange(event) {
    const data = new FormDataExtended(event.currentTarget.closest("FORM")).object;
    this.model.updateSource(data);
    this.render();
  }

  /**
   * Confirm and submit the form, and resolve the promise.
   * @this SpellcastingDialog
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The targeted element.
   */
  static #onConfirm(event, target) {
    const data = this.model.toObject();
    data.cost = this.cost;
    if (this.isDamage) data.formula = this.formula;
    this.resolve?.(data);
    this.close();
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll("SELECT, INPUT").forEach(n => {
      n.addEventListener("change", this.#onChange.bind(this));
    });
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
      return base + increase * data.scale[d];
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
