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
      template: "systems/artichron/templates/sheets/item/activity-sheet/identity.hbs",
    },
    details: {
      template: "systems/artichron/templates/sheets/item/activity-sheet/details.hbs",
    },
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

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextIdentity(context, options) {
    const a = context.pseudoDocument;
    context.ctx = {
      namePlaceholder: game.i18n.localize(a.constructor.metadata.label),
      enriched: await foundry.applications.ux.TextEditor.enrichHTML(a.description, {
        rollData: a.getRollData(), relativeTo: context.document,
      }),
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDetails(context, options) {
    // FIXME: Use `context.ctx`.

    const a = context.pseudoDocument;
    const makeLegend = path => a.schema.getField(path).label;

    const _prepareField = (path) => {
      // FIXME: Get rid of this helper method.
      const doc = a;
      const field = doc.schema.getField(path);
      const value = foundry.utils.getProperty(doc, path);
      const src = foundry.utils.getProperty(doc._source, path);
      return { field, value, src, name: path };
    };

    context.cost = Object.assign(_prepareField("cost.value"), {
      legend: game.i18n.localize("ARTICHRON.SHEET.LEGENDS.configuration"),
    });

    if (a.item.type === "elixir") {
      context.usage = Object.assign(_prepareField("cost.uses"), { show: true });
    }

    // Target
    if (a.schema.has("target")) {
      context.target = {
        show: true,
        legend: makeLegend("target"),
        fields: [],
        type: Object.assign(_prepareField("target.type"), { options: artichron.config.TARGET_TYPES.optgroups }),
      };

      if (a.hasTemplate) context.target.fields.push(_prepareField("target.duration"));
      const configuration = artichron.config.TARGET_TYPES[a.target.type];
      for (const s of configuration.scale) context.target.fields.push(_prepareField(`target.${s}`));
    }

    // Damage
    if (a.schema.has("damage")) {
      const groups = artichron.config.DAMAGE_TYPES.optgroups;
      context.damage = {
        show: true,
        damages: a.damage.map(damage => ({
          damage,
          fields: damage.schema.fields,
          source: damage._source,
          damageGroups: groups,
        })),
      };
    }

    // Defend
    if (a.schema.has("defend")) {
      context.defend = {
        show: true,
        legend: makeLegend("defend"),
        number: _prepareField("defend.number"),
        denomination: _prepareField("defend.denomination"),
      };
    }

    // Healing
    if (a.schema.has("healing")) {
      context.healing = {
        show: true,
        legend: makeLegend("healing"),
        number: _prepareField("healing.number"),
        denomination: _prepareField("healing.denomination"),
      };
    }

    // Effect
    if (a.schema.has("effects")) {
      context.effects = {
        show: true,
        legend: makeLegend("effects"),
        ids: _prepareField("effects.ids"),
      };
      context.effects.ids.choices = this.item.transferrableEffects.map(effect => {
        return { value: effect.id, label: effect.name };
      });
    }

    // Teleport
    if (a.schema.has("teleport")) {
      context.teleport = {
        show: true,
        legend: makeLegend("teleport"),
        distance: _prepareField("teleport.distance"),
      };
    }

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Add a damage part.
   * @this {ActivitySheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #addDamage(event, target) {
    this.activity.createDamage();
  }

  /* -------------------------------------------------- */

  /**
   * Delete a damage part.
   * @this {ActivitySheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #deleteDamage(event, target) {
    const id = target.closest("[data-id]").dataset.id;
    this.activity.deleteDamage(id);
  }

  /* -------------------------------------------------- */

  /**
   * Show sheet of a damage part.
   * @this {ActivitySheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #showDamage(event, target) {
    const id = target.closest("[data-id]").dataset.id;
    this.activity.damage.get(id).sheet.render({ force: true });
  }
}
