import PseudoDocumentSheet from "./pseudo-document-sheet.mjs";

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
    context.name = {
      field: context.activity.schema.getField("name"),
      value: context.activity._source.name,
      placeholder: game.i18n.localize(context.activity.constructor.metadata.defaultName),
    };

    context.img = {
      field: context.activity.schema.getField("img"),
      value: context.activity.img,
    };

    context.description = {
      field: context.activity.schema.getField("description"),
      value: context.activity.description,
      enriched: await TextEditor.enrichHTML(context.activity.description, {
        rollData: context.activity.getRollData(), relativeTo: context.item,
      }),
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
        value: foundry.utils.getProperty(context.activity, path),
      };
    };

    const makeLegend = path => context.activity.schema.getField(path).label;

    context.cost = makeField("cost.value");
    context.cost.legend = game.i18n.localize("ARTICHRON.SheetLabels.Configuration");

    if (this.activity.item.type === "elixir") {
      context.usage = { show: true, ...makeField("cost.uses") };
    }

    // Target
    const target = context.activity.schema.has("target");
    if (target) {
      context.target = {
        show: true,
        legend: makeLegend("target"),
        fields: [],
        type: { ...makeField("target.type"), options: artichron.config.TARGET_TYPES.optgroups },
      };

      if (context.activity.hasTemplate) context.target.fields.push(makeField("target.duration"));
      const configuration = artichron.config.TARGET_TYPES[context.activity.target.type];
      for (const s of configuration.scale) context.target.fields.push(makeField(`target.${s}`));
    }

    // Damage
    const damage = context.activity.schema.has("damage");
    if (damage) {
      const groups = artichron.config.DAMAGE_TYPES.optgroups;
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
              options: (path === "type") ? groups : undefined,
            };
          }),
        })),
      };
    }

    // Defend
    const defend = context.activity.schema.has("defend");
    if (defend) {
      context.defend = {
        show: true,
        legend: makeLegend("defend"),
        number: makeField("defend.number"),
        denomination: makeField("defend.denomination"),
      };
    }

    // Healing
    const healing = context.activity.schema.has("healing");
    if (healing) {
      context.healing = {
        show: true,
        legend: makeLegend("healing"),
        number: makeField("healing.number"),
        denomination: makeField("healing.denomination"),
      };
    }

    // Effect
    const effects = context.activity.schema.has("effects");
    if (effects) {
      context.effects = {
        show: true,
        legend: makeLegend("effects"),
        ids: makeField("effects.ids"),
      };
      context.effects.ids.choices = this.item.transferrableEffects.map(effect => {
        return { value: effect.id, label: effect.name };
      });
    }

    // Teleport
    const teleport = context.activity.schema.has("teleport");
    if (teleport) {
      context.teleport = {
        show: true,
        legend: makeLegend("teleport"),
        distance: makeField("teleport.distance"),
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
