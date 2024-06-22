const renderCarousel = foundry.utils.debounce(ct => ct.apps?.[0]?.render(), 150);

export default class CombatTrackerArtichron extends CombatTracker {
  render(...args) {
    const result = super.render(...args);
    renderCarousel(this);
    return result;
  }
}

const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

export class CombatCarousel extends HandlebarsApplicationMixin(ApplicationV2) {
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

  static PARTS = {
    controls: {
      template: "systems/artichron/templates/combat/carousel-controls.hbs"
    },
    tracker: {
      template: "systems/artichron/templates/combat/carousel.hbs"
    }
  };

  get combat() {
    return game.combats.active;
  }

  get combatants() {
    return this.combat.combatants;
  }

  constructor(options = {}) {
    super(options);
    ui.combat.apps = [this];
  }

  _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else document.querySelector("#ui-top #navigation").insertAdjacentElement("afterend", element);
  }

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

  _preSyncPartState(partId, newElement, priorElement, state) {
    super._preSyncPartState(partId, newElement, priorElement, state);

    for (const c of priorElement.querySelectorAll(".combatant")) {
      const id = c.dataset.id;
      state.offsets ??= {};
      state.offsets[id] = c.offsetLeft;
    }
  }

  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "tracker") {
      const turnsN = newElement.querySelectorAll(".combatant");
      for (const n of turnsN) {
        const o = state.offsets?.[n.dataset.id];
        if (o) n.animate([{left: `${o}px`}, {left: `${n.offsetLeft}px`}], {duration: 300, easing: "ease-in-out"});
      }
    }
  }

  static #beginCombat(event, target) {
    this.combat.startCombat();
  }

  static #endCombat(event, target) {
    this.combat.endCombat();
  }

  static #previousTurn(event, target) {
    this.combat.previousTurn();
  }

  static #nextTurn(event, target) {
    this.combat.nextTurn();
  }

  static #pingCombatant(event, target) {
    const id = target.closest("[data-id]").dataset.id;
    const combatant = this.combat.combatants.get(id);
    if (!canvas.ready || (combatant.sceneId !== canvas.scene.id)) return;
    if (!combatant.token.object.visible) {
      ui.notifications.warn("COMBAT.WarnNonVisibleToken", {localize: true});
    } else canvas.ping(combatant.token.object.center);
  }

  static #toggleDefeated(event, target) {
    const id = target.closest("[data-id]").dataset.id;
    const combatant = this.combat.combatants.get(id);
    const actor = combatant.actor;
    if (actor) actor.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, {overlay: true});
  }

  static #toggleHidden(event, target) {
    const id = target.closest("[data-id]").dataset.id;
    const combatant = this.combat.combatants.get(id);
    const combatants = this.combat.getCombatantsByToken(combatant.token);
    this.combat.updateEmbeddedDocuments("Combatant", combatants.map(c => ({_id: c.id, hidden: !combatant.hidden})));
  }
}
