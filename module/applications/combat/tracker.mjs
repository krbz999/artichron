const renderCarousel = foundry.utils.debounce(ct => ct.apps?.[0]?.render(), 150);

export default class CombatTrackerArtichron extends CombatTracker {
  /** @override */
  render(...args) {
    const result = super.render(...args);
    renderCarousel(this);
    return result;
  }
}

const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

export class CombatCarousel extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    ui.combat.apps = [this];
  }

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
      toggleHidden: this.#toggleHidden
    }
  };

  /** @override */
  static PARTS = {
    controls: {
      template: "systems/artichron/templates/combat/carousel-controls.hbs"
    },
    tracker: {
      template: "systems/artichron/templates/combat/carousel.hbs"
    }
  };

  /**
   * Any current combat.
   * @type {CombatArtichron|null}
   */
  get combat() {
    return game.combats.active;
  }

  /**
   * Any current combat's combatants.
   * @type {CombatantArtichron[]}
   */
  get combatants() {
    return this.combat.combatants;
  }

  /** @override */
  _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else document.querySelector("#ui-top #navigation").insertAdjacentElement("afterend", element);
  }

  /** @override */
  async _prepareContext(options) {
    const context = {};

    const c = this.combat;
    context.isGM = game.user.isGM;
    context.combat = c;
    context.active = false;

    if (c && c.started) {
      context.active = true;
      context.turns = [];
      const turn = c.turn;
      for (const [i, t] of c.turns.entries()) {
        const dead = t.isDefeated;
        const cssClasses = [
          "combatant",
          t.hidden ? "hidden" : null,
          dead ? "defeated" : null,
          (turn === i) ? "current" : null
        ].filterJoin(" ");
        const conditions = t.actor?.effects.filter(e => {
          return (e.type === "condition") && (e.system.primary !== CONFIG.specialStatusEffects.DEFEATED);
        }) ?? [];

        const left = `calc((var(--combatant-carousel-width) + 4px + 1rem + 10px) * ${i})`;

        context.turns.push({
          token: t.token,
          idx: i,
          combatant: t,
          pips: Array(t.actor.system.pips.value).fill(0),
          left: left,
          defeated: dead,
          initiative: t.initiative,
          isOwner: t.isOwner,
          isObserver: context.isGM || !!t.actor?.testUserPermission(game.user, "OBSERVER"),
          cssClasses: cssClasses,
          conditions: conditions,
          canPing: (t.sceneId === canvas.scene?.id) && game.user.hasPermission("PING_CANVAS"),
          hide: !context.isGM && t.token.hidden
        });
      }
    }

    return context;
  }

  /** @override */
  _preSyncPartState(partId, newElement, priorElement, state) {
    super._preSyncPartState(partId, newElement, priorElement, state);

    if (partId === "tracker") {
      for (const c of priorElement.querySelectorAll(".combatant")) {
        const id = c.dataset.id;
        state.offsets ??= {};
        state.offsets[id] = {
          left: c.offsetLeft,
          top: c.offsetTop
        };
      }
      state.scrollLeft = priorElement.scrollLeft;
    }
  }

  /** @override */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "tracker") {
      const turnsN = newElement.querySelectorAll(".combatant");
      const transitions = [];
      for (const n of turnsN) {
        const o = state.offsets?.[n.dataset.id];
        const m = {left: n.offsetLeft, top: n.offsetTop};
        if (o && !foundry.utils.objectsEqual(o, m)) transitions.push({
          element: n,
          params: [
            {left: `${o.left}px`, top: `${o.top}px`},
            {left: `${m.left}px`, top: `${m.top}px`}
          ],
          options: {duration: 300, easing: "ease-in-out"}
        });
      }

      // Sync the left scroll position.
      if (state.scrollLeft) newElement.scrollLeft = state.scrollLeft;

      const current = newElement.querySelector(".combatant.current");
      this.transitionCombatantsAndScrollIntoView(current, transitions);
    }
  }

  /**
   * Perform an animated scroll and transition of the combatants and the tracker.
   * @param {HTMLElement} [current]     The combatant marked as 'current'.
   * @param {object[]} transitions      The configuration of animations.
   */
  transitionCombatantsAndScrollIntoView(current, transitions) {
    current?.scrollIntoView({behavior: "smooth", inline: "center"});
    for (const {element, params, options} of transitions) {
      element.animate(params, options);
    }
  }

  /**
   * Handle initiating combat.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #beginCombat(event, target) {
    this.combat.startCombat();
  }

  /**
   * Handle ending combat.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #endCombat(event, target) {
    this.combat.endCombat();
  }

  /**
   * Handle moving to the previous turn.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #previousTurn(event, target) {
    this.combat.previousTurn();
  }

  /**
   * Handle moving to the next turn.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #nextTurn(event, target) {
    this.combat.nextTurn();
  }

  /**
   * Handle pinging a combatant.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #pingCombatant(event, target) {
    const id = target.closest("[data-id]").dataset.id;
    const combatant = this.combat.combatants.get(id);
    if (!canvas.ready || (combatant.sceneId !== canvas.scene.id)) return;
    if (!combatant.token.object.visible) {
      ui.notifications.warn("COMBAT.WarnNonVisibleToken", {localize: true});
    } else canvas.ping(combatant.token.object.center);
  }

  /**
   * Handle toggling the defeated status.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #toggleDefeated(event, target) {
    const id = target.closest("[data-id]").dataset.id;
    const combatant = this.combat.combatants.get(id);
    const actor = combatant.actor;
    if (actor) actor.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, {overlay: true});
  }

  /**
   * Handle toggling the 'hidden' property.
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The clicked element.
   */
  static #toggleHidden(event, target) {
    const id = target.closest("[data-id]").dataset.id;
    const combatant = this.combat.combatants.get(id);
    const combatants = this.combat.getCombatantsByToken(combatant.token);
    this.combat.updateEmbeddedDocuments("Combatant", combatants.map(c => ({_id: c.id, hidden: !combatant.hidden})));
  }
}
