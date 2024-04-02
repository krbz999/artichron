export default class SpellcastingDialog extends Application {
  /** @override */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push("artichron", "spellcasting-dialog");
    options.height = "auto";
    options.width = 400;
    options.template = "systems/artichron/templates/chat/spellcasting-dialog.hbs";
    return options;
  }

  /**
   * Create an async instance of this application.
   * @param {ActorArtichron} actor
   * @param {ItemArtichron} item
   * @param {object} [options]
   */
  static async create(actor, item, options = {}) {
    return new Promise(resolve => {
      new this(actor, item, {...options, resolve: resolve}).render(true);
    });
  }

  /**
   * @constructor
   * @param {ActorArtichron} actor
   * @param {ItemArtichron} item
   * @param {object} [options]
   */
  constructor(actor, item, options = {}) {
    super(options);
    this.actor = actor;
    this.item = item;
    if (options.resolve) this.resolve = options.resolve;
  }

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.SpellcastingDialog.Title", {item: this.item.name});
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
   */
  get max() {
    return this.actor.system.pools.mana.value;
  }

  /** @override */
  render(...args) {
    this.actor.apps[this.appId] = this;
    return super.render(...args);
  }

  /** @override */
  async close(...args) {
    delete this.actor.apps[this.appId];
    this.resolve?.(null);
    return super.close(...args);
  }

  /** @override */
  getData() {
    const dtypeOptions = this._getDamageOptions();
    const shapeOptions = this._getShapeOptions();

    const scales = CONFIG.SYSTEM.SPELL_TARGET_TYPES[this.model.shape].scale;

    return {
      dtypeOptions: dtypeOptions,
      shapeOptions: shapeOptions,
      model: this.model,
      invalid: this.cost > this.max,
      damageOptions: this._getManaOptions("damage"),
      countOptions: scales.has("count") ? this._getManaOptions("count") : null,
      distanceOptions: scales.has("distance") ? this._getManaOptions("distance") : null,
      widthOptions: scales.has("width") ? this._getManaOptions("width") : null,
      rangeOptions: scales.has("range") ? this._getManaOptions("range") : null,
      radiusOptions: scales.has("radius") ? this._getManaOptions("radius") : null,
      formula: this.formula,
      label: this._getLabel()
    };
  }

  /**
   * Get the displayed label.
   * @returns {string}
   */
  _getLabel() {
    const data = this.constructor.determineTemplateData(this.model.toObject());
    let label;
    if (this.model.shape === "single") {
      label = `${this.model.scale.count + 1} target(s)`;
    } else if (this.model.shape === "ray") {
      label = `${data.distance}m line, ${data.width}m wide`;
    } else if (this.model.shape === "cone") {
      label = `${data.distance}m cone`;
    } else if (this.model.shape === "circle") {
      label = `${data.distance}m circle, range up to ${data.range}m`;
    } else if (this.model.shape === "radius") {
      label = `${data.distance}m radius from caster`;
    }

    const part = this.item.system.damage[this.model.part];
    const dtype = game.i18n.localize(CONFIG.SYSTEM.DAMAGE_TYPES[part.type].label);

    return `${this.formula} ${dtype} damage; ${label}`;
  }

  /**
   * Get the damage type options.
   * @returns {object}
   */
  _getDamageOptions() {
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
      acc[k] = {...v, label: `${game.i18n.localize(v.label)} [d${v.faces}]`};
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
    const max = this.item.system.damage.length - 1;
    return this._model ??= new (class SpellcastingModel extends foundry.abstract.DataModel {
      static defineSchema() {
        return {
          scale: new foundry.data.fields.SchemaField({
            count: new foundry.data.fields.NumberField({integer: true, min: 0}),
            distance: new foundry.data.fields.NumberField({integer: true, min: 0}),
            width: new foundry.data.fields.NumberField({integer: true, min: 0}),
            range: new foundry.data.fields.NumberField({integer: true, min: 0}),
            radius: new foundry.data.fields.NumberField({integer: true, min: 0}),
            damage: new foundry.data.fields.NumberField({integer: true, min: 0})

          }),
          part: new foundry.data.fields.NumberField({integer: true, min: 0, max: max, initial: 0}),
          shape: new foundry.data.fields.StringField({required: true, initial: "single"})
        };
      }
    })();
  }

  /**
   * The current mana cost of the spell being sculpted.
   * @type {number}
   */
  get cost() {
    const spellType = CONFIG.SYSTEM.SPELL_TARGET_TYPES[this.model.shape];
    return spellType.scale.reduce((acc, k) => acc + this.model.scale[k], this.model.scale.damage);
  }

  /**
   * Get the current formula depending on choices made.
   * @type {string}
   */
  get formula() {
    const damage = this.item.system.damage[this.model.part];
    const p0 = new Roll(damage.formula, this.item.getRollData(), {type: damage.type}).alter(1 + this.model.scale.damage, 0);
    const p1 = `1d${CONFIG.SYSTEM.SPELL_TARGET_TYPES[this.model.shape].faces}`;
    return `${p0.formula} + ${p1}`;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html = html[0];
    html.querySelectorAll("SELECT").forEach(n => {
      n.addEventListener("change", event => {
        const {name, value} = event.currentTarget;
        this.model.updateSource({[name]: value});
        this.render();
      });
    });

    html.querySelector("[data-action=confirm]").addEventListener("click", event => {
      const data = this.model.toObject();
      data.cost = this.cost;
      data.formula = this.formula;
      this.resolve?.(data);
      this.close();
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
    let count;

    const getValue = (d) => {
      const [base, increase] = CONFIG.SYSTEM.SPELL_TARGET_TYPES[data.shape][d];
      return base + increase * data.scale[d];
    };

    switch (data.shape) {
      case "single": return; // TODO
      case "ray": {
        type = "ray";
        distance = getValue("distance");
        width = getValue("width");
        attach = true;
        break;
      }
      case "cone": {
        type = "cone";
        distance = getValue("distance");
        angle = 45;
        attach = true;
        break;
      }
      case "circle": {
        type = "circle";
        distance = getValue("radius");
        range = getValue("range");
        attach = false;
        break;
      }
      case "radius": {
        type = "circle";
        distance = getValue("radius");
        attach = true;
        break;
      }
    }

    return {type, distance, width, attach, angle, range, count};
  }
}
