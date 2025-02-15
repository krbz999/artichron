const { NumberField, StringField } = foundry.data.fields;

export default class ProgressionData extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      _id: new StringField({
        required: true,
        initial: () => foundry.utils.randomID(),
        readonly: true,
      }),
      type: new StringField({
        required: true,
        blank: false,
        initial: this.TYPE,
        validate: value => value === this.TYPE,
        validationError: `must be equal to "${this.TYPE}"`,
        choices: () => Object.entries(ProgressionData.TYPES).reduce((acc, [k, v]) => {
          acc[k] = v.TYPE;
          return acc;
        }, {}),
      }),
    };
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The type property of this data model.
   * @type {string}
   */
  static TYPE = "";

  /* -------------------------------------------------- */

  /**
   * The valid types of values for progressions.
   * @type {Record<string, ProgressionData>}
   */
  static get TYPES() {
    return {
      [ProgressionPoolData.TYPE]: ProgressionPoolData,
      [ProgressionSkillData.TYPE]: ProgressionSkillData,
    };
  }

  /* -------------------------------------------------- */

  /**
   * The actor this data model is embedded on.
   * @type {ActorArtichron}
   */
  get actor() {
    return this.parent.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Alias for the internal unique identifier of this progression.
   * @type {string}
   */
  get id() {
    return this._id;
  }

  /* -------------------------------------------------- */

  /**
   * Remove this progression from the actor and undo the changes it has made.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated actor.
   */
  async removeProgression() {
    throw new Error("removeProgression in ProgressionData must be subclassed!");
  }

  /* -------------------------------------------------- */
  /*   Static methods                                   */
  /* -------------------------------------------------- */

  /**
   * Create a prompt to configure a new instance of this data model and apply its changes to the actor.
   * @param {ActorArtichron} actor          The actor on which to create this progression.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated actor.
   */
  static async toPrompt(actor) {
    throw new Error("The 'toPrompt' method of ProgressionData must be subclassed.");
  }

}

class ProgressionPoolData extends ProgressionData {
  /** @override */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      pool: new StringField({
        required: true,
        initial: "stamina",
        choices: CONFIG.SYSTEM.POOL_TYPES,
      }),
      value: new NumberField({ min: 2, step: 2, initial: 2, nullable: false }),
    });
  }

  /* -------------------------------------------------- */

  /** @override */
  static TYPE = "pool";

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.ACTOR.Progression",
    "ARTICHRON.ACTOR.Progression.Pool",
  ];

  /* -------------------------------------------------- */

  /** @override */
  static async toPrompt(actor) {
    const fields = Object.values(ProgressionPoolData.schema.fields).reduce((acc, field) => {
      if (["_id", "type"].includes(field.name)) return acc;
      const options = (field.name === "value") ? {
        max: actor.system.progression.points.available.toNearest(2, "floor"),
      } : {};
      acc.push(field.toFormGroup({ localize: true }, options).outerHTML);
      return acc;
    }, []);

    const content = `<fieldset>${fields.join("")}</fieldset>`;
    return foundry.applications.api.DialogV2.prompt({
      content: content,
      modal: true,
      window: {
        title: game.i18n.format("ARTICHRON.ProgressionDialog.PoolTitle", { name: actor.name }),
        icon: "fa-solid fa-arrow-trend-up",
      },
      position: { width: 400, height: "auto" },
      ok: { callback: (event, button, html) => {
        const { pool, value } = new FormDataExtended(button.form).object;
        const modelData = { pool: pool, value: value, type: this.TYPE };
        return ProgressionPoolData.#applyProgression(actor, modelData);
      } },
    });
  }

  /* -------------------------------------------------- */

  /**
   * Create and apply this progression to the actor.
   * @param {ActorArtichron} actor          The actor to modify.
   * @param {object} data                   The source data used for the progression.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated actor.
   */
  static async #applyProgression(actor, data) {
    const source = actor.toObject();
    const update = {};
    const path = `system.pools.${data.pool}.increase`;
    const value = foundry.utils.getProperty(source, path);
    update[path] = value + data.value / 2;

    const progs = source.system.progression.points.spent;
    progs.push(data);
    update["system.progression.points.spent"] = progs;

    return actor.update(update);
  }

  /* -------------------------------------------------- */

  /** @override */
  async removeProgression() {
    const update = {};
    const source = this.actor.toObject();
    const path = `system.pools.${this.pool}.increase`;
    const value = foundry.utils.getProperty(source, path);
    update[path] = value - this.value / 2;

    const progs = source.system.progression.points.spent;
    progs.findSplice(p => p._id === this.id);
    update["system.progression.points.spent"] = progs;

    return this.actor.update(update);
  }
}

class ProgressionSkillData extends ProgressionData {
  /** @override */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      skill: new StringField({
        required: true,
        initial: "agility",
        choices: CONFIG.SYSTEM.SKILLS,
      }),
      value: new NumberField({ min: 1, step: 1, initial: 1, nullable: false }),
    });
  }

  /* -------------------------------------------------- */

  /** @override */
  static TYPE = "skill";

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.ACTOR.Progression",
    "ARTICHRON.ACTOR.Progression.Skill",
  ];

  /* -------------------------------------------------- */

  /** @override */
  static async toPrompt(actor) {
    const fields = Object.values(ProgressionSkillData.schema.fields).reduce((acc, field) => {
      if (["_id", "type"].includes(field.name)) return acc;
      const options = (field.name === "value") ? {
        max: actor.system.progression.points.available,
      } : {};
      acc.push(field.toFormGroup({ localize: true }, options).outerHTML);
      return acc;
    }, []);

    const content = `<fieldset>${fields.join("")}</fieldset>`;
    return foundry.applications.api.DialogV2.prompt({
      content: content,
      modal: true,
      window: {
        title: game.i18n.format("ARTICHRON.ProgressionDialog.SkillTitle", { name: actor.name }),
        icon: "fa-solid fa-arrow-trend-up",
      },
      position: { width: 400, height: "auto" },
      ok: { callback: (event, button, html) => {
        const { skill, value } = new FormDataExtended(button.form).object;
        const modelData = { skill: skill, value: value, type: this.TYPE };
        return ProgressionSkillData.#applyProgression(actor, modelData);
      } },
    });
  }

  /* -------------------------------------------------- */

  /**
   * Create and apply this progression to the actor.
   * @param {ActorArtichron} actor          The actor to modify.
   * @param {object} data                   The source data used for the progression.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated actor.
   */
  static #applyProgression(actor, data) {
    const source = actor.toObject();
    const update = {};
    const path = `system.skills.${data.skill}.number`;
    const value = foundry.utils.getProperty(source, path);
    update[path] = value + data.value;

    const progs = source.system.progression.points.spent;
    progs.push(data);
    update["system.progression.points.spent"] = progs;

    return actor.update(update);
  }

  /* -------------------------------------------------- */

  /** @override */
  async removeProgression() {
    const update = {};
    const source = this.actor.toObject();
    const path = `system.skills.${this.skill}.number`;
    const value = foundry.utils.getProperty(source, path);
    update[path] = value - this.value;

    const progs = source.system.progression.points.spent;
    progs.findSplice(p => p._id === this.id);
    update["system.progression.points.spent"] = progs;

    return this.actor.update(update);
  }
}
