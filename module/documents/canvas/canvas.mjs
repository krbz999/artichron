export default function auraInit() {
  Hooks.on("renderTokenConfig", Auras.onRenderTokenConfig);
  Hooks.on("refreshWall", Auras.onRefreshWall);
  Hooks.on("deleteWall", Auras.onRefreshWall);
  Hooks.on("drawGridLayer", Auras.onDrawGridLayer);
}

class Auras {
  /**
   * Inject new tab and form on Token config.
   * @param {TokenConfig5e} config      The token config.
   * @param {HTMLElement} html          The element of the config.
   */
  static onRenderTokenConfig(config, [html]) {
    const aura = config.token.flags.artichron?.aura ?? {};
    const div = document.createElement("DIV");

    // Expand the width
    config.position.width = 560;
    config.setPosition(config.position);

    const nav = html.querySelector("nav.sheet-tabs.tabs[data-group=\"main\"]");
    div.innerHTML = `
    <a class="item" data-tab="auras">
      <i class="fa-solid fa-dot-circle"></i>
      ${game.i18n.localize("ARTICHRON.Auras")}
    </a>`;
    nav.appendChild(div.firstElementChild);

    const color = aura.color ? `value="${aura.color}"` : "";
    const alpha = Number.isNumeric(aura.alpha) ? `value="${Math.clamp(aura.alpha, 0, 1)}"` : "";
    const distance = Number.isNumeric(aura.distance) && (aura.distance > 0) ? `value="${aura.distance}"` : "";

    const auraConfig = `
    <div class="form-group">
      <label>${game.i18n.localize("ARTICHRON.AuraColor")}</label>
      <div class="form-fields">
        <input class="color" type="text" ${color} name="flags.artichron.aura.color">
        <input type="color" ${color} data-edit="flags.artichron.aura.color">
      </div>
    </div>
    <div class="form-group">
      <label>
        ${game.i18n.localize("ARTICHRON.AuraOpacity")}
        <span class="units">(0 &mdash; 1)</span>
      </label>
      <div class="form-fields">
        <input type="number" ${alpha} step="0.1" min="0" max="1" name="flags.artichron.aura.alpha">
      </div>
    </div>
    <div class="form-group">
      <label>
        ${game.i18n.localize("SCENES.GridDistance")}
        <span class="units">(${game.i18n.localize("GridUnits")})</span>
      </label>
      <div class="form-fields">
        <input type="number" ${distance} step="1" name="flags.artichron.aura.distance" min="0">
      </div>
    </div>`;

    div.innerHTML = `<div class="tab" data-tab="auras">${auraConfig}</div>`;
    div.querySelectorAll("INPUT[type=color][data-edit]").forEach(n => {
      n.addEventListener("change", config._onChangeInput.bind(config));
    });
    html.querySelector("footer").before(div.firstElementChild);
  }

  /**
   * Immediately refresh auras when a wall is changed, such as a new wall created, or a door opened.
   */
  static onRefreshWall() {
    for (const token of canvas.tokens.placeables) token.drawAura();
  }

  /**
   * Initialize container for token auras on the grid layer.
   * @param {GridLayer} layer     The grid layer.
   */
  static onDrawGridLayer(layer) {
    layer.tokenAuras = layer.addChildAt(new PIXI.Container(), layer.getChildIndex(layer.mesh));
  }

}
