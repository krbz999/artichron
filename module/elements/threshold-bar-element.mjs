export default class ThresholdBarElement extends HTMLElement {
  /**
   * Factory method for handlebar helper.
   */
  static create({ limit = 5, value = 0, max } = {}) {
    const element = new this();
    element.setAttribute("limit", String(limit));
    element.setAttribute("value", String(value));
    if (max) element.setAttribute("max", String(max));
    return element;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The tag name of this element.
   * @type {string}
   */
  static tagName = "threshold-bar";

  /* -------------------------------------------------- */
  /*   Event listeners                                  */
  /* -------------------------------------------------- */

  /** @override */
  connectedCallback() {
    const limit = parseInt(this.getAttribute("limit"));
    const max = parseInt(this.getAttribute("max")) || Infinity;
    const value = Math.min(parseInt(this.getAttribute("value")), max);

    const thresholds = document.createElement("SPAN");
    const met = Math.floor(value / limit);
    thresholds.textContent = met;

    let leftover = value % limit;
    if (leftover === 0) leftover = (value === 0) ? 0 : limit;
    const bar = document.createElement("DIV");
    bar.setAttribute("style", `--limit: ${limit}`);
    for (let i = 0; i < limit; i++) {
      const pip = document.createElement("SPAN");
      if (i < leftover) pip.classList.add("filled");
      bar.insertAdjacentElement("beforeend", pip);
    }
    bar.dataset.tooltip = `${leftover} / ${limit}`;

    this.insertAdjacentElement("beforeend", thresholds);
    this.insertAdjacentElement("beforeend", bar);
  }
}
