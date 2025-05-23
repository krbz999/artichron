const { HandlebarsApplicationMixin, DocumentSheet } = foundry.applications.api;

export default class HeroPoolConfig extends HandlebarsApplicationMixin(DocumentSheet) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["artichron"],
    sheetConfig: false,
    position: {
      width: 400,
      height: "auto",
    },
    window: {
      contentClasses: ["standard-form"],
    },
    form: {
      closeOnSubmit: true,
      submitOnChange: false,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    faces: {
      template: "systems/artichron/templates/apps/actor/hero-pool-config/faces.hbs",
    },
    max: {
      template: "systems/artichron/templates/apps/actor/hero-pool-config/max.hbs",
    },
    footer: {
      template: "systems/artichron/templates/shared/footer.hbs",
    },
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("ARTICHRON.PoolConfig.Title", { name: this.document.name });
  }

  /* -------------------------------------------------- */

  /**
   * Track the value of the 'faces.config' select across re-renders.
   * @type {string}
   */
  #faces = null;

  /* -------------------------------------------------- */

  /**
   * Track the value of the 'faces.maxPool' select across re-renders.
   * @type {string}
   */
  #facesLargest = null;

  /* -------------------------------------------------- */

  /**
   * Track the value of the 'max.config' select across re-renders.
   * @type {string}
   */
  #max = null;

  /* -------------------------------------------------- */

  /**
   * Track the value of the 'max.maxPool' select across re-renders.
   */
  #maxLargest = null;

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    switch (partId) {
      case "faces": return this.#prepareFaces(context);
      case "max": return this.#prepareMax(context);
      case "footer": return this.#prepareFooter(context);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the 'faces' part for rendering.
   * @param {object} context        The rendering context.
   * @returns {Promise<object>}     A promise that resolves to the mutated rendering context.
   */
  async #prepareFaces(context) {
    const field = new foundry.data.fields.StringField({
      choices: artichron.config.POOL_FACES_SPECIALIZATION_TYPES,
      hint: artichron.config.POOL_FACES_SPECIALIZATION_TYPES[this.#faces]?.hint,
    });

    context.faces = {
      field: field,
      value: this.#faces,
      selects: [],
    };

    if (!this.#faces) return context;

    const [min, mid, max] = artichron.config.POOL_FACES_SPECIALIZATION_TYPES[this.#faces].faces;
    if (min === max) return context;

    const value = this.#facesLargest || "health";
    const largest = new foundry.data.fields.StringField({
      choices: {
        health: "ARTICHRON.ACTOR.FIELDS.pools.health.label",
        stamina: "ARTICHRON.ACTOR.FIELDS.pools.stamina.label",
        mana: "ARTICHRON.ACTOR.FIELDS.pools.mana.label",
      },
      label: "Largest",
    });
    context.faces.selects.push({ name: "faces.maxPool", field: largest, value: value });

    if (min < mid) {
      const choices = foundry.utils.deepClone(largest.choices);
      delete choices[value];
      const smallest = new foundry.data.fields.StringField({
        choices: choices,
        label: "Smallest",
      });
      context.faces.selects.push({ name: "faces.minPool", field: smallest, value: "mana" });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the 'max' part for rendering.
   * @param {object} context        The rendering context.
   * @returns {Promise<object>}     A promise that resolves to the mutated rendering context.
   */
  async #prepareMax(context) {
    const field = new foundry.data.fields.StringField({
      choices: artichron.config.POOL_SIZE_SPECIALIZATION_TYPES,
      hint: artichron.config.POOL_SIZE_SPECIALIZATION_TYPES[this.#max]?.hint,
    });

    context.max = {
      field: field,
      value: this.#max,
      selects: [],
    };

    if (!this.#max) return context;

    const [min, mid, max] = artichron.config.POOL_SIZE_SPECIALIZATION_TYPES[this.#max].sizes;
    if (min === max) return context;

    const value = this.#maxLargest || "health";
    const largest = new foundry.data.fields.StringField({
      choices: artichron.config.POOL_TYPES,
      label: "Largest",
    });
    context.max.selects.push({ name: "max.maxPool", field: largest, value: value });

    if (min < mid) {
      const choices = foundry.utils.deepClone(artichron.config.POOL_TYPES);
      delete choices[value];
      const smallest = new foundry.data.fields.StringField({
        choices: choices,
        label: "Smallest",
      });
      context.max.selects.push({ name: "max.minPool", field: smallest, value: "mana" });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the 'footer' part for rendering.
   * @param {object} context        The rendering context.
   * @returns {Promise<object>}     A promise that resolves to the mutated rendering context.
   */
  async #prepareFooter(context) {
    context.footer = { disabled: !this.#max || !this.#faces };
    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    if (partId === "faces") {
      for (const select of htmlElement.querySelectorAll("SELECT")) {
        select.addEventListener("change", event => {
          const name = event.currentTarget.name;
          const value = event.currentTarget.value;
          const parts = ["faces", "footer"];
          if (name === "faces.config") this.#faces = value;
          else if (name === "faces.maxPool") this.#facesLargest = value;
          else parts.shift();
          this.render({ parts: parts });
        });
      }
    } else if (partId === "max") {
      for (const select of htmlElement.querySelectorAll("SELECT")) {
        select.addEventListener("change", event => {
          const name = event.currentTarget.name;
          const value = event.currentTarget.value;
          const parts = ["max", "footer"];
          if (name === "max.config") this.#max = value;
          else if (name === "max.maxPool") this.#maxLargest = value;
          else parts.shift();
          this.render({ parts: parts });
        });
      }
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _processFormData(event, form, formData) {
    const { max, faces } = super._processFormData(event, form, formData);
    const update = createPoolUpdate(max, faces);
    return update;
  }
}

/**
 * Create an actor update for starting pool configuration.
 * @param {object} [max]                Configuration for the wanted pool sizes.
 * @param {string} [max.config]         The type of configuration for pool sizes ('balanced', 'specialized', 'focused').
 * @param {string} [max.minPool]        The pool that should be the smallest ('health', 'mana', 'stamina').
 * @param {string} [max.maxPool]        The pool that should be the largest ('health', 'mana', 'stamina').
 * @param {object} [faces]              Configuration for the wanted pool die sizes.
 * @param {string} [faces.config]       The type of configuration for pool die sizes ('balanced', 'specialized', 'focused').
 * @param {string} [faces.minPool]      The pool that should be the smallest die size ('health', 'mana', 'stamina').
 * @param {string} [faces.maxPool]      The pool that should be the largest die size ('health', 'mana', 'stamina').
 */
function createPoolUpdate(max, faces) {
  const u = max ? poolMax(max) : {};
  const v = faces ? poolFaces(faces) : {};
  return foundry.utils.mergeObject(u, v);
}
function poolMax({ config, minPool, maxPool }) {
  return _applyConfig({ config, minPool, maxPool, appendix: "base" });
}
function poolFaces({ config, minPool, maxPool }) {
  return _applyConfig({ config, minPool, maxPool, appendix: "faces" });
}
function _applyConfig({ config, minPool, maxPool, appendix }) {
  const c = artichron.config[`POOL_${(appendix === "base") ? "SIZE" : "FACES"}_SPECIALIZATION_TYPES`];
  const [min, mid, max] = c[config][(appendix === "base") ? "sizes" : "faces"];
  const update = {};

  const keys = new Set(["health", "stamina", "mana"]);

  // is maxPool required parameter?
  const maxReq = max > min;
  if (maxReq && !keys.has(maxPool)) {
    throw new Error("maxPool must be health, stamina, or mana.");
  }

  // is minPool required parameter?
  const minReq = min < mid;
  if (minReq && !keys.has(minPool)) {
    throw new Error("minPool must be health, stamina, or mana.");
  }

  // throw error if minPool and maxPool cannot be identical
  if ((minPool === maxPool) && maxReq) {
    throw new Error("minPool and maxPool cannot be identical.");
  }

  const configure = (k, v) => {
    if (!k) k = keys.first();
    update[`system.pools.${k}.${appendix}`] = v;
    keys.delete(k);
  };

  configure(maxReq ? maxPool : null, max);
  configure(minReq ? minPool : null, min);
  configure(null, mid);

  return update;
}
