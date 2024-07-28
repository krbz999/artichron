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

    const isFilled = value >= max;

    const pct = (100 / max);
    const delta = 360 / max;

    const opacityMin = 0.3;
    const opacityDelta = (1 - opacityMin) / max;

    for (let i = 1; i <= max; i++) {
      const slice = document.createElement("DIV");
      slice.classList.add("slice");
      if (i <= value) slice.classList.add("active");
      const styles = [
        `--p: ${isFilled ? 100 : pct};`,
        `--iter: ${(i - 1) * delta}deg;`,
        `opacity: ${isFilled ? 1 : slice.classList.contains("active") ? (opacityMin + i * opacityDelta) : 0};`
      ];
      slice.setAttribute("style", styles.join(" "));
      this.insertAdjacentElement("beforeend", slice);
      if (isFilled) break;
    }

    if (isFilled) this.classList.add("filled");

    const text = document.createElement("SPAN");
    text.classList.add("counter");
    text.textContent = `${Math.clamp(value, 0, max)} / ${max}`;
    this.insertAdjacentElement("beforeend", text);
  }
}
