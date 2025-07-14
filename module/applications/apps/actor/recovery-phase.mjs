import Application from "../../api/application.mjs";

export default class RecoveryPhase extends Application {
  constructor({ party, ...options } = {}) {
    if (!(party?.system instanceof artichron.data.actors.PartyData)) {
      throw new Error("A RecoveryPhase must be constructed with a party actor.");
    }
    super(options);
    this.#party = party;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "recovery-phase",
    window: {
      positioned: false,
      title: "ARTICHRON.RECOVERY.title",
    },
    position: {
      left: 0,
      top: 0,
    },
    actions: {
      unassign: RecoveryPhase.#unassign,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    members: {
      template: "systems/artichron/templates/apps/actor/recovery-phase/members.hbs",
    },
    tasks: {
      template: "systems/artichron/templates/apps/actor/recovery-phase/tasks.hbs",
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

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.party = this.#party;
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextMembers(context, options) {
    const ctx = context.ctx = { members: [] };

    for (const { actor } of this.#party.system.members) {
      const isAssigned = Object.values(this.#party.system.recovery.tasks).some(task => task.assigned.has(actor.id));
      ctx.members.push({
        actor, isAssigned,
        draggable: actor.isOwner && !isAssigned,
      });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextTasks(context, options) {
    const ctx = context.ctx = { tasks: [] };

    for (const k in this.#party.system.recovery.tasks) {
      const { label, skills, threshold, ...rest } = this.#party.system.recovery.tasks[k];
      const assigned = rest.assigned.map(id => this.#party.system.members.get(id)).filter(_ => _).map(a => a.actor);
      ctx.tasks.push({
        threshold, assigned,
        task: {
          label,
          id: k,
        },
        primarySkill: {
          id: skills.primary,
          config: artichron.config.SKILLS[skills.primary],
        },
        secondarySkill: {
          id: skills.secondary,
          config: artichron.config.SKILLS[skills.secondary],
        },
      });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextFooter(context, options) {
    const ctx = context.ctx = {};
    if (game.user.isGM) context.buttons = [{
      type: "submit", label: "ARTICHRON.RECOVERY.confirm", icon: "fa-solid fa-check",
    }];
    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.#party.apps[this.id] = this;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    new foundry.applications.ux.DragDrop.implementation({
      dragSelector: ".draggable",
      dropSelector: "[data-task]",
      callbacks: {
        dragstart: RecoveryPhase.#onDragStart.bind(this),
        drop: RecoveryPhase.#onDrop.bind(this),
      },
    }).bind(this.element);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onClose(options) {
    super._onClose(options);
    delete this.#party.apps[this.id];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _canRender(options) {
    if (!this.#party?.getFlag("artichron", "recovering")) {
      if (this.rendered) this.close();
      return false;
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * @this {RecoveryPhase}
   * @param {DragEvent} event
   */
  static #onDragStart(event) {
    const id = event.target.closest("[data-actor-id]").dataset.actorId;
    event.dataTransfer.setData("text/plain", JSON.stringify({
      actorId: id,
      type: "RecoveryPhaseAssignment",
    }));
  }

  /* -------------------------------------------------- */

  /**
   * @this {RecoveryPhase}
   * @param {DragEvent} event
   */
  static #onDrop(event) {
    const { type, actorId } = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (type !== "RecoveryPhaseAssignment") return;
    const actor = this.#party.system.members.get(actorId).actor;
    const task = event.target.closest("[data-task]").dataset.task;
    artichron.data.actors.PartyData.assignTask(actor, { task });
  }

  /* -------------------------------------------------- */

  /**
   * Unassign an actor from a task.
   * @this {RecoveryPhase}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #unassign(event, target) {
    const id = target.closest("[data-actor-id]").dataset.actorId;
    const actor = game.actors.get(id);
    const task = target.closest("[data-task]").dataset.task;
    artichron.data.actors.PartyData.assignTask(actor, { task, unassign: true });
  }
}
