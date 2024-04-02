export default class SpellcastingDialog extends Application {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push("artichron", "spellcasting-dialog");
    options.height = "auto";
    options.width = 400;
    options.template = "systems/artichron/templates/chat/spellcasting-dialog.hbs";
    return options;
  }

  static async create(actor, item, options = {}) {
    return new Promise(resolve => {
      new this(actor, item, {...options, resolve: resolve}).render(true);
    });
  }

  constructor(actor, item, options = {}) {
    super(options);
    this.actor = actor;
    this.item = item;
    if (options.resolve) this.resolve = options.resolve;
  }

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

    const dtype = game.i18n.localize(CONFIG.SYSTEM.DAMAGE_TYPES[this.model.dtype].label);

    return `${this.formula} ${dtype} damage; ${label}`;
  }

  _getDamageOptions() {
    let options = Object.entries(CONFIG.SYSTEM.DAMAGE_TYPES).reduce((acc, [k, v]) => {
      if (Number.isInteger(v.faces)) {
        acc.push([k, {label: `${game.i18n.localize(v.label)} [d${v.faces}]`, faces: v.faces}]);
      }
      return acc;
    }, []);
    options.sort((a, b) => b[1].faces - a[1].faces);
    return Object.fromEntries(options);
  }

  _getShapeOptions() {
    return Object.entries(CONFIG.SYSTEM.SPELL_TARGET_TYPES).reduce((acc, [k, v]) => {
      acc[k] = {...v, label: `${game.i18n.localize(v.label)} [d${v.faces}]`};
      return acc;
    }, {});
  }

  _getManaOptions(scale) {
    let label;
    if (scale === "damage") label = (n) => `+${n}d${CONFIG.SYSTEM.DAMAGE_TYPES[this.model.dtype].faces}`;
    else if (scale === "count") label = (n) => `+${n}`;
    else label = (n) => `+${CONFIG.SYSTEM.SPELL_TARGET_SCALE_VALUES[scale] * n}m`;
    return Object.fromEntries(Array.fromRange(this.max, 1).map(n => [n, `${label(n)} [${n}/${this.max}]`]));
  }

  /**
   * Custom model for holding form data.
   * @type {DataModel}
   */
  get model() {
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
          dtype: new foundry.data.fields.StringField({required: true, initial: "fire"}),
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
    const p0 = `${1 + this.model.scale.damage}d${CONFIG.SYSTEM.DAMAGE_TYPES[this.model.dtype].faces}`;
    const p1 = `1d${CONFIG.SYSTEM.SPELL_TARGET_TYPES[this.model.shape].faces}`;
    return `${p0} + ${p1}`;
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

  static determineTemplateData(data) {
    let type;
    let distance;
    let width;
    let attach;
    let angle;
    let range;
    let count;

    const getValue = (d) => {
      const base = CONFIG.SYSTEM.SPELL_TARGET_TYPES[data.shape][d];
      return base + CONFIG.SYSTEM.SPELL_TARGET_SCALE_VALUES[d] * data.scale[d];
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
