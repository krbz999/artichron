export default class TokenHUDArtichron extends CONFIG.Token.hudClass {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.scrollY ??= [];
    options.scrollY.push(".status-column");
    return options;
  }

  getData(options = {}) {
    const data = super.getData(options);
    this._effects = data.statusEffects;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    let innerHTML = Object.values(this._effects).reduce((acc, eff, i) => {
      const c = i < (Object.values(this._effects)).length / 2 ? "left" : "right";
      const status = `
      <div class="status-effect ${eff.cssClass}" data-status-id="${eff.id}">
        <img class="img" src="${eff.src}">
        <label class="name">${eff.title}</label>
      </div>`;
      acc[c].push(status);
      return acc;
    }, {left: [], right: []});
    innerHTML = Object.values(innerHTML).map(c => `<div class="status-column">${c.join("")}</div>`).join("");

    const effects = html[0].querySelector(".status-effects");
    effects.innerHTML = innerHTML;
    effects.querySelectorAll(".status-effect").forEach(n => {
      n.addEventListener("click", this.#onToggleEffect.bind(this));
      n.addEventListener("contextmenu", event => this.#onToggleEffect(event, {overlay: true}));
    });
  }

  #onToggleEffect(event, {overlay = false} = {}) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.actor) {
      ui.notifications.warn("HUD.WarningEffectNoActor", {localize: true});
      return;
    }
    const statusId = event.currentTarget.dataset.statusId;
    this.actor.toggleStatusEffect(statusId, {overlay});
  }
}
