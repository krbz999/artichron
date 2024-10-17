export default class ActivitySheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(options) {
    super(options);
    this.#item = options.document.item;
    this.#activityId = options.document.id;
  }

  /* -------------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      addDamage: ActivitySheet.#addDamage,
      deleteDamage: ActivitySheet.#deleteDamage,
      showDamage: ActivitySheet.#showDamage
    },
    classes: ["artichron", "activity"],
    document: null,
    form: {
      handler: ActivitySheet.#onSubmitForm,
      submitOnChange: true
    },
    position: {
      width: 500,
      height: "auto"
    },
    tag: "form",
    window: {
      icon: "fa-solid fa-bolt-lightning",
      contentClasses: ["standard-form"]
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    identity: {
      template: "systems/artichron/templates/item/activity-identity.hbs"
    },
    details: {
      template: "systems/artichron/templates/item/activity-details.hbs"
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "identity"
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The item that has this activity.
   * @type {ItemArtichron}
   */
  #item = null;

  /* -------------------------------------------------- */

  /**
   * The id of the activity.
   * @type {string}
   */
  #activityId = null;

  /* -------------------------------------------------- */

  /**
   * The activity.
   * @type {BaseActivity}
   */
  get activity() {
    return this.#item.system.activities.get(this.#activityId);
  }

  /* -------------------------------------------------- */

  /**
   * The item that has this activity.
   * @type {ItemArtichron}
   */
  get item() {
    return this.#item;
  }

  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.SHEET.ACTIVITY.title", {
      name: this.activity.name
    });
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {
      activity: this.activity,
      item: this.item,
      actor: this.item.actor
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    switch (partId) {
      case "tabs":
        return this.#prepareTabsContext(context);
      case "identity":
        return this.#prepareIdentityContext(context);
      case "details":
        return this.#prepareDetailsContext(context);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for the navigation.
   * @param {object} context        Rendering context.
   * @returns {Promise<object>}     Mutated rendering context.
   */
  async #prepareTabsContext(context) {
    const tabs = {
      identity: {id: "identity", group: "primary", icon: "fa-solid fa-tag", label: "ARTICHRON.SheetLabels.Identity"},
      details: {id: "details", group: "primary", icon: "fa-solid fa-pen-fancy", label: "ARTICHRON.SheetLabels.Details"}
    };
    for (const v of Object.values(tabs)) {
      v.active = this.tabGroups[v.group] === v.id;
      v.cssClass = v.active ? "active" : "";
    }
    context.tabs = tabs;
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for the identity tab.
   * @param {object} context        Rendering context.
   * @returns {Promise<object>}     Mutated rendering context.
   */
  async #prepareIdentityContext(context) {
    context.name = {
      field: context.activity.schema.getField("name"),
      value: context.activity.name
    };

    context.img = {
      field: context.activity.schema.getField("img"),
      value: context.activity.img
    };

    context.description = {
      field: context.activity.schema.getField("description"),
      value: context.activity.description,
      enriched: await TextEditor.enrichHTML(context.activity.description, {
        rollData: context.item.getRollData(), relativeTo: context.item
      })
    };

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for the details tab.
   * @param {object} context        Rendering context.
   * @returns {Promise<object>}     Mutated rendering context.
   */
  async #prepareDetailsContext(context) {
    const makeField = path => {
      return {
        field: context.activity.schema.getField(path),
        value: foundry.utils.getProperty(context.activity, path)
      };
    };

    const makeLegend = path => context.activity.schema.getField(path).label;

    context.cost = makeField("cost.value");
    context.cost.legend = game.i18n.localize("ARTICHRON.SheetLabels.Configuration");

    if (this.activity.item.type === "elixir") {
      context.usage = {show: true, ...makeField("cost.uses")};
    }

    // Target
    const target = context.activity.schema.has("target");
    if (target) {
      context.target = {
        show: true,
        legend: makeLegend("target"),
        fields: [],
        type: {...makeField("target.type"), options: CONFIG.SYSTEM.TARGET_TYPES.optgroups}
      };

      if (context.activity.hasTemplate) context.target.fields.push(makeField("target.duration"));
      const configuration = CONFIG.SYSTEM.TARGET_TYPES[context.activity.target.type];
      for (const s of configuration.scale) context.target.fields.push(makeField(`target.${s}`));
    }

    // Damage
    const damage = context.activity.schema.has("damage");
    if (damage) {
      const groups = CONFIG.SYSTEM.DAMAGE_TYPES.optgroups;
      context.damage = {
        show: true,
        legend: makeLegend("damage"),
        damages: context.activity.damage.map(damage => ({
          damage: damage,
          fields: ["number", "denomination", "type"].map(path => {
            return {
              field: damage.schema.getField(path),
              name: `damage.${damage.id}.${path}`,
              value: foundry.utils.getProperty(damage, path),
              classes: [path, "label-top"].join(" "),
              options: (path === "type") ? groups : undefined
            };
          })
        }))
      };
    }

    // Defend
    const defend = context.activity.schema.has("defend");
    if (defend) {
      context.defend = {
        show: true,
        legend: makeLegend("defend"),
        number: makeField("defend.number"),
        denomination: makeField("defend.denomination")
      };
    }

    // Healing
    const healing = context.activity.schema.has("healing");
    if (healing) {
      context.healing = {
        show: true,
        legend: makeLegend("healing"),
        number: makeField("healing.number"),
        denomination: makeField("healing.denomination")
      };
    }

    // Effect
    const effects = context.activity.schema.has("effects");
    if (effects) {
      context.effects = {
        show: true,
        legend: makeLegend("effects"),
        ids: makeField("effects.ids")
      };
      context.effects.ids.choices = this.item.transferrableEffects.map(effect => {
        return {value: effect.id, label: effect.name};
      });
    }

    // Teleport
    const teleport = context.activity.schema.has("teleport");
    if (teleport) {
      context.teleport = {
        show: true,
        legend: makeLegend("teleport"),
        distance: makeField("teleport.distance")
      };
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.item.apps[this.id] = this;
  }

  /* -------------------------------------------------- */

  /** @override */
  _onClose(_options) {
    delete this.item.apps[this.id];
  }

  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   * @this {ActivitySheet}
   * @param {PointerEvent} event            The originating click event.
   * @param {HTMLElement} form              The form element.
   * @param {FormDataExtended} formData     The form data.
   */
  static #onSubmitForm(event, form, formData) {
    const submitData = foundry.utils.expandObject(formData.object);
    this.activity.update(submitData);
  }

  /* -------------------------------------------------- */

  /**
   * Add a damage part.
   * @this {ActivitySheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #addDamage(event, target) {
    this.activity.damage.createDamage();
  }

  /* -------------------------------------------------- */

  /**
   * Delete a damage part.
   * @this {ActivitySheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #deleteDamage(event, target) {
    const id = target.closest("[data-id]").dataset.id;
    this.activity.damage.deleteDamage(id);
  }

  /* -------------------------------------------------- */

  /**
   * Show sheet of a damage part.
   * @this {ActivitySheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #showDamage(event, target) {
    const id = target.closest("[data-id]").dataset.id;
    this.activity.damage.get(id).sheet.render({force: true});
  }
}
