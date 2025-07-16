import Application from "../../api/application.mjs";

export default class RecoveryPhaseConfig extends Application {
  constructor({ party, ...options } = {}) {
    if (!(party?.system instanceof artichron.data.actors.PartyData)) {
      throw new Error("A RecoveryPhaseConfig must be constructed with a party actor.");
    }

    super(options);
    this.#party = party;
    this.#clone = party.system.clone();
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "recovery-phase-config",
    classes: ["recovery-phase-config"],
    position: {
      width: 600,
    },
    window: {
      title: "ARTICHRON.RECOVERY.CONFIG.TITLE",
    },
    form: {
      submitOnChange: true,
    },
    actions: {
      addTask: RecoveryPhaseConfig.#addTask,
      removeTask: RecoveryPhaseConfig.#removeTask,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    tasks: {
      template: "systems/artichron/templates/apps/actor/recovery-phase-config/tasks.hbs",
      classes: ["scrollable", "standard-form"],
      scrollable: [".scrollable"],
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /* -------------------------------------------------- */

  /**
   * The party actor.
   * @type {foundry.documents.Actor}
   */
  #party;

  /* -------------------------------------------------- */

  /**
   * Currently configured tasks.
   * @type {artichron.data.actors.PartyData}
   */
  #clone;

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextTasks(context, options) {
    const ctx = context.ctx = {};

    ctx.tasks = this.#clone.recovery.tasks;
    ctx.taskSuggestions = Object.fromEntries(
      Object.entries(artichron.config.RECOVERY_TASKS).filter(([k]) => !(k in ctx.tasks)),
    );
    ctx.skillOptions = artichron.config.SKILLS;
    ctx.party = this.#party;

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextFooter(context, options) {
    const ctx = context.ctx = {};
    context.buttons = [{
      type: "submit",
      label: "ARTICHRON.RECOVERY.CONFIG.confirm",
      icon: "fa-solid fa-check",
      disabled: foundry.utils.isEmpty(this.#clone.recovery.tasks),
    }];
    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onChangeForm(formConfig, event) {
    if (event.type === "change") return RecoveryPhaseConfig.#updateTasks.call(this, event);
    return super._onChangeForm(formConfig, event);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "tasks") {
      const id = `#${this.id}-task-suggestion`;
      const o = priorElement.querySelector(id);
      const n = newElement.querySelector(id);
      if (o && n && !!n.querySelector(`OPTION[value="${o.value}"]`)) n.value = o.value;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Update the party data clone and re-render the application.
   * @this {RecoveryPhaseConfig}
   */
  static #updateTasks(event) {
    const formData = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.form).object);
    try {
      this.#clone.updateSource({ "recovery.tasks": formData.tasks });
    } catch (err) {
      console.error(err);
    }
    this.render();
  }

  /* -------------------------------------------------- */

  /**
   * Add a new task.
   * @this {RecoveryPhaseConfig}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #addTask(event, target) {
    const suggestion = this.element.querySelector(`#${this.id}-task-suggestion`).value;
    const id = suggestion ? suggestion : foundry.utils.randomID();
    const label = suggestion
      ? artichron.config.RECOVERY_TASKS[id].label
      : game.i18n.localize("ARTICHRON.RECOVERY.CONFIG.newTask");
    const skill = suggestion ? artichron.config.RECOVERY_TASKS[id].skill : "agility";
    this.#clone.updateSource({ [`recovery.tasks.${id}`]: { label, threshold: 1, skills: { primary: skill } } });
    this.render();
  }

  /* -------------------------------------------------- */

  /**
   * Remove a task task.
   * @this {RecoveryPhaseConfig}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #removeTask(event, target) {
    const taskId = target.closest("[data-task]").dataset.task;
    this.#clone.updateSource({ [`recovery.tasks.-=${taskId}`]: null });
    this.render();
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _processSubmitData(event, form, formData, submitOptions) {
    const tasks = {};
    const data = this.#clone.toObject().recovery.tasks;
    for (const k in data) {
      const { label, skills, threshold } = data[k];
      tasks[k] = { label, skills, threshold };
    }
    return tasks;
  }
}
