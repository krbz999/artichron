export default class ProgressClockElement extends HTMLElement {
  /**
   * Factory method for handlebars helper.
   * @param {object} config             The creation configuration object.
   * @param {number} [config.max]       The maximum amount of slices.
   * @param {number} [config.value]     The currently filled in amount of slices.
   * @returns {ProgressClockElement}
   */
  static create(config) {
    const element = document.createElement(ProgressClockElement.tagName);
    element.setAttribute("max", config.max ?? 8);
    element.setAttribute("value", config.value ?? 0);
    element.setAttribute("style", `--color: ${config.color ? config.color.rgb.map(k => k * 255).join(",") : "0,0,255"}`);
    return element;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static tagName = "progress-clock";

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @override */
  connectedCallback() {
    const max = parseInt(this.getAttribute("max"));
    const value = parseInt(this.getAttribute("value"));

    const opacityMin = 0.2;
    const opacityDelta = (1 - opacityMin) / max;

    const slices = document.createElement("DIV");
    slices.classList.add("slices");

    const clr = (alpha, pct, active) => {
      if (active) return `rgba(var(--color), ${alpha}) 0 ${pct}%`;
      return "rgba(0, 0, 0, 0) 0";
    };

    const gradients = [];
    for (let i = 0; i <= value; i++) {
      const active = i < value;
      const alpha = opacityMin + (i + 1) * opacityDelta;
      const p = Math.round((i + 1) / max * 100);
      if (i < max) gradients.push(clr(alpha, p, active));
      if (!active) break;
    }

    slices.style.background = `conic-gradient(${gradients.join(", ")}`;
    this.insertAdjacentElement("beforeend", slices);

    const text = document.createElement("SPAN");
    text.classList.add("counter");
    text.textContent = `${Math.clamp(value, 0, max)} / ${max}`;
    this.insertAdjacentElement("beforeend", text);
  }
}
