const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

export default class CombatCarousel extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @class
   * @param {object} [options]      Application rendering options.
   */
  constructor(options = {}) {
    super(options);
    ui.combat.apps = [this];
  }

  /* -------------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "combat-carousel",
    classes: ["combat-carousel"],
    tag: "aside",
    position: {
      height: "auto"
    },
    window: {
      frame: false,
      positioned: false
    },
    actions: {
      beginCombat: this.#beginCombat,
      endCombat: this.#endCombat,
      previousTurn: this.#previousTurn,
      nextTurn: this.#nextTurn,
      pingCombatant: this.#pingCombatant,
      toggleDefeated: this.#toggleDefeated,
      toggleHidden: this.#toggleHidden,
      toggleCollapsed: this.#toggleCollapsed,
      selectCombatant: this.#onSelectCombatant
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    controls: {
      template: "systems/artichron/templates/combat/carousel-controls.hbs"
    },
    tracker: {
      template: "systems/artichron/templates/combat/carousel.hbs"
    }
  };

  /* -------------------------------------------------- */

  /**
   * Any current combat.
   * @type {CombatArtichron|null}
   */
  get combat() {
    return game.combats.active;
  }

  /* -------------------------------------------------- */

  /**
   * Any current combat's combatants.
   * @type {CombatantArtichron[]}
   */
  get combatants() {
    return this.combat.combatants;
  }

  /* -------------------------------------------------- */

  /** @override */
  _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else document.querySelector("#ui-top #navigation").insertAdjacentElement("afterend", element);
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {};

    const c = this.combat;
    context.isGM = game.user.isGM;
    context.combat = c;
    context.active = false;
    context.collapsed = game.settings.get("artichron", "combatTrackerCollapsed") ? "collapsed" : "";

    if (c && c.started) {
      context.active = true;
      context.turns = [];
      const turn = c.turn;
      let hidden = 0;
      for (const [i, t] of c.turns.entries()) {
        const dead = t.isDefeated;
        const cssClasses = [
          "combatant",
          t.hidden ? "hidden" : null,
          dead ? "defeated" : null,
          (turn === i) ? "current" : null,
          (t.token.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) ? "hostile" : null,
          (t.token.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) ? "friendly" : null
        ].filterJoin(" ");
        const conditions = t.actor?.effects.filter(e => {
          return (e.type === "condition") && (e.system.primary !== CONFIG.specialStatusEffects.DEFEATED);
        }) ?? [];

        const pips = t.actor.system.pips.value;
        const hp = t.actor.system.health;
        const observer = context.isGM || !!t.actor?.testUserPermission(game.user, "OBSERVER");
        const hide = !context.isGM && t.hidden;
        if (hide) hidden++;

        context.turns.push({
          token: t.token,
          idx: i,
          combatant: t,
          ap: {
            pips: Array(pips > 18 ? 17 : pips).fill(0),
            overflow: pips > 18,
            amount: pips
          },
          left: Math.max(i - hidden, 0),
          defeated: dead,
          initiative: t.initiative,
          isOwner: t.isOwner,
          isObserver: observer,
          cssClasses: cssClasses,
          conditions: conditions,
          canPing: (t.sceneId === canvas.scene?.id) && game.user.hasPermission("PING_CANVAS"),
          hide: hide,
          health: {
            value: hp.value,
            max: hp.max,
            pct: hp.pct
          }
        });
      }
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @override */
  _preSyncPartState(partId, newElement, priorElement, state) {
    super._preSyncPartState(partId, newElement, priorElement, state);

    if (partId === "tracker") {
      for (const c of priorElement.querySelectorAll(".combatant")) {
        const id = c.dataset.id;
        state.offsets ??= {};
        state.offsets[id] = {
          left: c.offsetLeft,
          top: c.offsetTop,
          hp: c.querySelector(".health .bar")?.clientWidth ?? false
        };
      }
      state.scrollLeft = priorElement.scrollLeft;
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "tracker") {
      const turnsN = newElement.querySelectorAll(".combatant");
      const transitions = [];
      for (const n of turnsN) {
        const o = state.offsets?.[n.dataset.id];
        const m = {left: n.offsetLeft, top: n.offsetTop};
        const positionChange = o ? (o.left !== m.left) || (o.top !== m.top) : false;
        if (positionChange) transitions.push({
          element: n,
          params: [
            {left: `${o.left}px`, top: `${o.top}px`},
            {left: `${m.left}px`, top: `${m.top}px`}
          ],
          options: {duration: 300, easing: "ease-in-out"}
        });
        if (o && (o.hp !== false)) {
          const bar = n.querySelector(".health .bar");
          if (bar) transitions.push({
            element: bar,
            params: [{width: `${o.hp}px`}, {width: `${bar.clientWidth}px`}],
            options: {duration: 300, easing: "ease-in-out"}
          });
        }
      }

      // Sync the left scroll position.
      if (state.scrollLeft) newElement.scrollLeft = state.scrollLeft;

      const current = newElement.querySelector(".combatant.current");
      this.#transitionCombatantsAndScrollIntoView(current, transitions);
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  _attachFrameListeners() {
    super._attachFrameListeners();
    new artichron.applications.ContextMenuArtichron(this.element, ".combatant[data-id]", [], {onOpen: element => {
      const combatant = this.combat.combatants.get(element.dataset.id);
      ui.context.menuItems = this._getCombatantContextOptions(combatant);
    }});
  }

  /* -------------------------------------------------- */

  /** @override */
  _onRender(...args) {
    super._onRender(...args);
    for (const combatant of this.element.querySelectorAll(".combatant")) {
      const name = combatant.querySelector(".name");
      name.addEventListener("dblclick", CombatCarousel.#renderActor.bind(this));
      combatant.addEventListener("pointerover", CombatCarousel.#onCombatantHoverIn.bind(this));
      combatant.addEventListener("pointerout", CombatCarousel.#onCombatantHoverOut.bind(this));
    }
  }

  /* -------------------------------------------------- */

  /**
   * Create context menu option for a combatant.
   * @param {CombatantArtichron} combatant      The combatant.
   * @returns {object[]}                        The array of options.
   */
  _getCombatantContextOptions(combatant) {
    const isGM = game.user.isGM;
    return [{
      name: "ARTICHRON.Combat.ContextUpdateCombatant",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      callback: () => combatant.sheet.render(true),
      condition: () => isGM
    }, {
      name: "ARTICHRON.Combat.ContextClearInitiative",
      icon: "<i class='fa-solid fa-fw fa-undo'></i>",
      callback: () => combatant.update({initiative: null}),
      condition: () => isGM && (combatant.initiative !== null)
    }, {
      name: "ARTICHRON.Combat.ContextRemoveCombatant",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      callback: () => combatant.delete(),
      condition: () => isGM
    }, {
      name: "ARTICHRON.Combat.ContextUpdateActionPoints",
      icon: "<i class='fa-solid fa-fw fa-circle'></i>",
      callback: () => combatant.actor.actionPointsDialog(),
      condition: () => combatant.actor.isOwner
    }];
  }

  /* -------------------------------------------------- */

  /**
   * Perform an animated scroll and transition of the combatants and the tracker.
   * @param {HTMLElement} [current]     The combatant marked as 'current'.
   * @param {object[]} transitions      The configuration of animations.
   */
  #transitionCombatantsAndScrollIntoView(current, transitions) {
    current?.scrollIntoView({behavior: "smooth", inline: "center"});
    for (const {element, params, options} of transitions) {
      element.animate(params, options);
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle double-clicks on a combatant to render its actor's sheet.
   * @this {CombatCarousel}
   * @param {Event} event     The initiating event.
   */
  static #renderActor(event) {
    const id = event.currentTarget.closest("[data-id]").dataset.id;
    const combatant = this.combat.combatants.get(id);
    const actor = combatant.actor;
    if (actor?.testUserPermission(game.user, "OBSERVER")) actor.sheet.render({force: true});
  }

  /* -------------------------------------------------- */

  /**
   * Handle selecting combatant.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #onSelectCombatant(event, target) {
    if (event.target.classList.contains("name")) return;
    if (event.detail > 1) return; // Ignore repeated clicks
    const id = target.dataset.id;
    const combatant = this.combat.combatants.get(id);
    const token = combatant.token?.object;
    if (!token?.actor?.testUserPermission(game.user, "OBSERVER")) return;
    const releaseOthers = !event.shiftKey;
    if (token.controlled) token.release();
    else {
      token.control({releaseOthers});
      canvas.animatePan(token.center);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Handle hover-in events on a combatant.
   * @param {Event} event     The pointer event.
   */
  static #onCombatantHoverIn(event) {
    const id = event.currentTarget.dataset.id;
    const combatant = this.combat.combatants.get(id);
    const token = combatant.token?.object;
    if (token && token.isVisible) {
      if (!token.controlled) token._onHoverIn(event, {hoverOutOthers: true});
      this._highlighted = token;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Handle hover-out events on a combatant.
   * @param {Event} event     The pointer event.
   */
  static #onCombatantHoverOut(event) {
    if (this._highlighted) this._highlighted._onHoverOut(event);
    this._highlighted = null;
  }

  /* -------------------------------------------------- */

  /**
   * Handle initiating combat.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #beginCombat(event, target) {
    this.combat.startCombat();
  }

  /* -------------------------------------------------- */

  /**
   * Handle ending combat.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #endCombat(event, target) {
    this.combat.endCombat();
  }

  /* -------------------------------------------------- */

  /**
   * Handle moving to the previous turn.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #previousTurn(event, target) {
    this.combat.previousTurn();
  }

  /* -------------------------------------------------- */

  /**
   * Handle moving to the next turn.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #nextTurn(event, target) {
    this.combat.nextTurn();
  }

  /* -------------------------------------------------- */

  /**
   * Handle pinging a combatant.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #pingCombatant(event, target) {
    event.stopPropagation(); // Don't trigger other events
    const id = target.closest("[data-id]").dataset.id;
    const combatant = this.combat.combatants.get(id);
    if (!canvas.ready || (combatant.sceneId !== canvas.scene.id)) return;
    if (!combatant.token.object.visible) {
      ui.notifications.warn("COMBAT.WarnNonVisibleToken", {localize: true});
    } else canvas.ping(combatant.token.object.center);
  }

  /* -------------------------------------------------- */

  /**
   * Handle toggling the defeated status.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #toggleDefeated(event, target) {
    event.stopPropagation(); // Don't trigger other events
    const id = target.closest("[data-id]").dataset.id;
    const combatant = this.combat.combatants.get(id);
    const actor = combatant.actor;
    if (actor) actor.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, {overlay: true});
  }

  /* -------------------------------------------------- */

  /**
   * Handle toggling the 'hidden' property.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #toggleHidden(event, target) {
    event.stopPropagation(); // Don't trigger other events
    const id = target.closest("[data-id]").dataset.id;
    const combatant = this.combat.combatants.get(id);
    const combatants = this.combat.getCombatantsByToken(combatant.token);
    this.combat.updateEmbeddedDocuments("Combatant", combatants.map(c => ({_id: c.id, hidden: !combatant.hidden})));
  }

  /* -------------------------------------------------- */

  /**
   * Toggle the collapsed state of the combat tracker.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #toggleCollapsed(event, target) {
    const collapsed = target.closest(".controls").classList.toggle("collapsed");
    game.settings.set("artichron", "combatTrackerCollapsed", collapsed);
  }
}
