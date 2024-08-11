const {NumberField, StringField} = foundry.data.fields;

export default class ProgressionData extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      _id: new StringField({
        required: true,
        initial: () => foundry.utils.randomID(),
        readonly: true
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
        }, {})
      })
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
      [ProgressionSkillData.TYPE]: ProgressionSkillData
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
  /*   Data preparation                                 */
  /* -------------------------------------------------- */

  /**
   * Apply this progression to its parent actor.
   */
  applyProgression() {}

  /* -------------------------------------------------- */
  /*   Static methods                                   */
  /* -------------------------------------------------- */

  /**
   * Create a prompt to configure a new instance of this data model.
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
        choices: CONFIG.SYSTEM.POOL_TYPES
      }),
      value: new NumberField({min: 2, step: 2, initial: 2})
    });
  }

  /* -------------------------------------------------- */

  /** @override */
  static TYPE = "pool";

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.ActorProperty.Progression",
    "ARTICHRON.ActorProperty.Progression.Pool"
  ];

  /* -------------------------------------------------- */

  /** @override */
  applyProgression() {
    // The pool size increases by 1 for every 2 points invested.
    this.actor.system.pools[this.pool].max += (this.value / 2);
  }

  /* -------------------------------------------------- */

  /** @override */
  static async toPrompt(actor) {
    const fields = Object.values(ProgressionPoolData.schema.fields).map(field => {
      if (["_id", "type"].includes(field.name)) return null;
      return field.toFormGroup({localize: true}, {}).outerHTML;
    });
    const content = `<fieldset>${fields.filterJoin("")}</fieldset>`;
    return foundry.applications.api.DialogV2.prompt({
      content: content,
      modal: true,
      rejectClose: false,
      window: {
        title: game.i18n.format("ARTICHRON.ProgressionDialog.PoolTitle", {name: actor.name}),
        icon: "fa-solid fa-arrow-trend-up"
      },
      position: {width: 400, height: "auto"},
      ok: {callback: (event, button, html) => {
        const {pool, value} = new FormDataExtended(button.form).object;
        const modelData = {pool: pool, value: value, type: this.TYPE};
        const progs = actor.system.toObject().progression.points.spent;
        return actor.update({"system.progression.points.spent": progs.concat([modelData])});
      }}
    });
  }
}

class ProgressionSkillData extends ProgressionData {
  /** @override */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      skill: new StringField({
        required: true,
        initial: "agility",
        choices: CONFIG.SYSTEM.SKILLS
      }),
      value: new NumberField({min: 1, step: 1, initial: 1})
    });
  }

  /* -------------------------------------------------- */

  /** @override */
  static TYPE = "skill";

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.ActorProperty.Progression",
    "ARTICHRON.ActorProperty.Progression.Skill"
  ];

  /* -------------------------------------------------- */

  /** @override */
  applyProgression() {
    // The quantity of dice increases by 1 for each point invested.
    const skill = this.actor.system.skills[this.skill];
    skill.number += this.value;
  }

  /* -------------------------------------------------- */

  /** @override */
  static async toPrompt(actor) {
    const fields = Object.values(ProgressionSkillData.schema.fields).map(field => {
      if (["_id", "type"].includes(field.name)) return null;
      return field.toFormGroup({localize: true}, {}).outerHTML;
    });
    const content = `<fieldset>${fields.filterJoin("")}</fieldset>`;
    return foundry.applications.api.DialogV2.prompt({
      content: content,
      modal: true,
      rejectClose: false,
      window: {
        title: game.i18n.format("ARTICHRON.ProgressionDialog.SkillTitle", {name: actor.name}),
        icon: "fa-solid fa-arrow-trend-up"
      },
      position: {width: 400, height: "auto"},
      ok: {callback: (event, button, html) => {
        const {skill, value} = new FormDataExtended(button.form).object;
        const modelData = {skill: skill, value: value, type: this.TYPE};
        const progs = actor.system.toObject().progression.points.spent;
        return actor.update({"system.progression.points.spent": progs.concat([modelData])});
      }}
    });
  }
}
