import PseudoDocumentSheet from "../../api/pseudo-document-sheet.mjs";

export default class ActivitySheet extends PseudoDocumentSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      addDamage: ActivitySheet.#addDamage,
      deleteDamage: ActivitySheet.#deleteDamage,
      showDamage: ActivitySheet.#showDamage,
    },
    classes: ["activity"],
    window: {
      icon: "fa-solid fa-bolt-lightning",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    ...super.PARTS,
    identity: {
      template: "systems/artichron/templates/item/activity-identity.hbs",
    },
    details: {
      template: "systems/artichron/templates/item/activity-details.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  tabGroups = {
    primary: "identity",
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The item that has this activity.
   * @type {ItemArtichron}
   */
  get item() {
    return this.document;
  }

  /* -------------------------------------------------- */

  /**
   * The activity.
   * @type {BaseActivity}
   */
  get activity() {
    return this.pseudoDocument;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    Object.assign(context, {
      activity: this.activity,
      item: this.item,
      actor: this.item.actor,
    });

    switch (partId) {
      case "identity":
        return this.#prepareIdentityContext(context);
      case "details":
        return this.#prepareDetailsContext(context);
    }

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for the identity tab.
   * @param {object} context        Rendering context.
   * @returns {Promise<object>}     Mutated rendering context.
   */
  async #prepareIdentityContext(context) {
    context.name = Object.assign(this._prepareField("name"), {
      placeholder: game.i18n.localize(context.activity.constructor.metadata.defaultName),
    });

    context.img = this._prepareField("img");

    context.description = Object.assign(this._prepareField("description"), {
      enriched: await foundry.applications.ux.TextEditor.enrichHTML(context.activity.description, {
        rollData: context.activity.getRollData(), relativeTo: context.item,
      }),
    });

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for the details tab.
   * @param {object} context        Rendering context.
   * @returns {Promise<object>}     Mutated rendering context.
   */
  async #prepareDetailsContext(context) {
    const makeLegend = path => context.activity.schema.getField(path).label;

    context.cost = Object.assign(this._prepareField("cost.value"), {
      legend: game.i18n.localize("ARTICHRON.SHEET.LEGENDS.configuration"),
    });

    if (this.activity.item.type === "elixir") {
      context.usage = Object.assign(this._prepareField("cost.uses"), { show: true });
    }

    // Target
    if (context.activity.schema.has("target")) {
      context.target = {
        show: true,
        legend: makeLegend("target"),
        fields: [],
        type: Object.assign(this._prepareField("target.type"), { options: artichron.config.TARGET_TYPES.optgroups }),
      };

      if (context.activity.hasTemplate) context.target.fields.push(this._prepareField("target.duration"));
      const configuration = artichron.config.TARGET_TYPES[context.activity.target.type];
      for (const s of configuration.scale) context.target.fields.push(this._prepareField(`target.${s}`));
    }

    // Damage
    if (context.activity.schema.has("damage")) {
      const groups = artichron.config.DAMAGE_TYPES.optgroups;
      context.damage = {
        show: true,
        damages: context.activity.damage.map(damage => ({
          damage: damage,
          fields: ["number", "denomination", "type"].map(path => {
            return {
              // FIXME: core bug; shouldn't need to grab the fields from the parent model
              field: context.activity.schema.getField(`damage.element.${path}`),
              name: `damage.${damage.id}.${path}`,
              value: foundry.utils.getProperty(damage, path),
              classes: [path, "label-top"].join(" "),
              options: (path === "type") ? groups : undefined,
            };
          }),
        })),
      };
    }

    // Defend
    if (context.activity.schema.has("defend")) {
      context.defend = {
        show: true,
        legend: makeLegend("defend"),
        number: this._prepareField("defend.number"),
        denomination: this._prepareField("defend.denomination"),
      };
    }

    // Healing
    if (context.activity.schema.has("healing")) {
      context.healing = {
        show: true,
        legend: makeLegend("healing"),
        number: this._prepareField("healing.number"),
        denomination: this._prepareField("healing.denomination"),
      };
    }

    // Effect
    if (context.activity.schema.has("effects")) {
      context.effects = {
        show: true,
        legend: makeLegend("effects"),
        ids: this._prepareField("effects.ids"),
      };
      context.effects.ids.choices = this.item.transferrableEffects.map(effect => {
        return { value: effect.id, label: effect.name };
      });
    }

    // Teleport
    if (context.activity.schema.has("teleport")) {
      context.teleport = {
        show: true,
        legend: makeLegend("teleport"),
        distance: this._prepareField("teleport.distance"),
      };
    }

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Add a damage part.
   * @this {ActivitySheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #addDamage(event, target) {
    this.activity.createDamage();
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
    this.activity.deleteDamage(id);
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
    this.activity.damage.get(id).sheet.render({ force: true });
  }
}
