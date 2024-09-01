export default class ActivitySheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(options) {
    super(options);
    this.#item = options.document.item;
    this.#activityId = options.document.id;
  }

  static DEFAULT_OPTIONS = {
    actions: {
      addDamage: ActivitySheet.#addDamage,
      deleteDamage: ActivitySheet.#deleteDamage
    },
    classes: ["artichron", "activity"],
    document: null,
    form: {
      handler: ActivitySheet.#onSubmitForm,
      submitOnChange: true
    },
    position: {
      width: 400,
      height: "auto"
    },
    tag: "form",
    window: {
      icon: "fa-solid fa-bolt-lightning",
      contentClasses: ["standard-form"]
    }
  };

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

  /** @override */
  tabGroups = {
    primary: "identity"
  };

  #item = null;

  #activityId = null;

  get activity() {
    return this.#item.system.activities.get(this.#activityId);
  }

  get item() {
    return this.#item;
  }

  get title() {
    return this.activity.name;
  }

  async _prepareContext(options) {
    const context = {
      activity: this.activity,
      item: this.item,
      actor: this.item.actor
    };
    return context;
  }

  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    switch (partId) {
      case "tabs":
        return this.#prepareTabsContext(context, options);
      case "identity":
        return this.#prepareIdentityContext(context, options);
      case "details":
        return this.#prepareDetailsContext(context, options);
    }
  }

  async #prepareTabsContext(context, options) {
    const tabs = {
      identity: {id: "identity", group: "primary", icon: "fa-solid fa-tag", label: "ARTICHRON.SheetTab.Identity"},
      details: {id: "details", group: "primary", icon: "fa-solid fa-pen-fancy", label: "ARTICHRON.SheetTab.Details"}
    };
    for (const v of Object.values(tabs)) {
      v.active = this.tabGroups[v.group] === v.id;
      v.cssClass = v.active ? "active" : "";
    }
    context.tabs = tabs;
    return context;
  }

  async #prepareIdentityContext(context, options) {
    context.name = {
      field: context.activity.schema.getField("name"),
      value: context.activity.name
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

  async #prepareDetailsContext(context, options) {
    const makeField = path => {
      return {
        field: context.activity.schema.getField(path),
        value: foundry.utils.getProperty(context.activity, path)
      };
    };

    const makeLegend = path => context.activity.schema.getField(path).label;

    context.cost = makeField("cost.value");
    context.cost.legend = makeLegend("cost");

    // Target
    context.target = {
      type: makeField("target.type"),
      legend: makeLegend("target")
    };
    context.target.type.options = CONFIG.SYSTEM.TARGET_TYPES.optgroups;
    const configuration = CONFIG.SYSTEM.TARGET_TYPES[context.activity.target.type];
    if (configuration.scale.has("count")) {
      context.target.count = {show: true, ...makeField("target.count")};
    }
    context.target.fields = [];
    for (const s of configuration.scale) {
      if (s === "count") continue;
      context.target.fields.push(makeField(`target.${s}`));
    }

    // Damage
    const damage = context.activity.schema.has("damage");
    if (damage) {
      context.damage = {
        show: true,
        legend: makeLegend("damage"),
        formula: context.activity.schema.getField("damage.element.formula"),
        type: context.activity.schema.getField("damage.element.type"),
        options: CONFIG.SYSTEM.DAMAGE_TYPES.optgroups,
        values: []
      };
      for (const [i, {formula, type}] of context.activity.damage.entries()) {
        context.damage.values.push({
          formula: formula, type: type,
          nameF: `damage.${i}.formula`, nameT: `damage.${i}.type`,
          idx: i
        });
      }
    }

    // Healing
    const healing = context.activity.schema.has("healing");
    if (healing) {
      context.healing = {
        show: true,
        legend: makeLegend("healing"),
        formula: makeField("healing.formula")
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
      console.warn(context.effects.ids.choices);
    }

    // Teleport
    const teleport = context.activity.schema.has("teleport");
    if (teleport) {
      context.teleport = {
        show: true,
        legend: makeLegend("teleport"),
        fields: []
      };

      context.teleport.fields.push(makeField("teleport.self"));
      context.teleport.fields.push(makeField("teleport.distance"));
      if (!context.activity.teleport.self) {
        context.teleport.fields.push(makeField("teleport.count"));
      }
    }

    return context;
  }

  /** @inheritdoc */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.item.apps[this.id] = this;
  }

  /** @override */
  _onClose(_options) {
    delete this.item.apps[this.id];
  }

  /**
   * @this {ActivitySheet}
   */
  static #onSubmitForm(event, form, formData) {
    const submitData = foundry.utils.expandObject(formData.object);
    const a = foundry.utils.getProperty(submitData, "damage");
    if (a) foundry.utils.setProperty(submitData, "damage", Object.values(a));
    this.activity.update(submitData);
  }

  static #addDamage(event, target) {
    const damage = this.activity.toObject().damage;
    damage.push({});
    this.activity.update({damage: damage});
  }

  static #deleteDamage(event, target) {
    const idx = Number(target.closest("[data-idx]").dataset.idx);
    const damage = this.activity.toObject().damage;
    damage.splice(idx, 1);
    this.activity.update({damage: damage});
  }
}
