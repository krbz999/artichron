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
          pips: Array(t.system.pips).fill(0),
          left: left,
          defeated: dead,
          initiative: t.initiative,
          isOwner: t.isOwner,
          isObserver: context.isGM || !!t.actor?.testUserPermission(game.user, "OBSERVER"),
          cssClasses: cssClasses,
          conditions: conditions,
          canPing: (t.sceneId === canvas.scene?.id) && game.user.hasPermission("PING_CANVAS"),
          hide: !context.isGM && t.hidden
        });
      }
    }

    return context;
  }

  _preSyncPartState(partId, newElement, priorElement, state) {
    super._preSyncPartState(partId, newElement, priorElement, state);

    for (const c of priorElement.querySelectorAll(".combatant")) {
      const id = c.dataset.id;
      state[id] ??= [];
      state[id].push(c.offsetLeft);
    }
  }

  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "tracker") {
      const turnsN = newElement.querySelectorAll(".combatant");

      const ids = new Set();
      for (const n of turnsN) ids.add(n.dataset.id);

      for (const id of ids) {
        const lefts = state[id];
        if (!lefts) continue;
        const turns = Array.from(turnsN).filter(k => k.dataset.id === id);
        for (const [i, left] of lefts.entries()) {
          const t = turns[i];
          if (t) t.animate([{left: `${left}px`}, {left: `${t.offsetLeft}px`}], {duration: 300, easing: "ease-in-out"});
        }
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
    combatant.update({hidden: !combatant.hidden});
  }
}
