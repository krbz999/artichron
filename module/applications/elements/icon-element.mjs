/**
 * Custom element for caching and displaying svgs.
 * Allows for styling.
 */
export default class IconElement extends HTMLElement {
  /**
   * Cached svg elements.
   * @type {Map<string, SVGElement|Promise<SVGElement>>}
   */
  static #svgCache = new Map();

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static tagName = "artichron-icon";

  /* -------------------------------------------------- */

  /**
   * Path to the SVG source file.
   * @type {string}
   */
  get src() {
    return this.getAttribute("src");
  }
  set src(src) {
    this.setAttribute("src", src);
  }

  /* -------------------------------------------------- */

  /**
   * Is the src used as a backdrop instead of regular image?
   * @type {boolean}
   */
  get isBackdrop() {
    return this.hasAttribute("backdrop");
  }

  /* -------------------------------------------------- */

  /** @inheritDoc */
  connectedCallback() {
    const insertElement = element => {
      if (!element) return;
      const clone = element.cloneNode(true);
      if (this.isBackdrop) this.innerHTML += clone.outerHTML;
      else this.innerHTML = clone.outerHTML;
    };

    // Insert element immediately if already available, otherwise wait for fetch
    const element = this.constructor.fetch(this.src);
    if (element instanceof Promise) element.then(insertElement);
    else insertElement(element);
  }

  /* -------------------------------------------------- */

  /**
   * Fetch and cache SVG element.
   * @param {string} filePath                     File path of the svg element.
   * @returns {SVGElement|Promise<SVGElement>}    Promise if the element is not cached, otherwise the element directly.
   */
  static fetch(src) {
    if (!IconElement.#svgCache.has(src)) IconElement.#svgCache.set(src, fetch(src)
      .then(b => b.text())
      .then(t => {
        const temp = document.createElement("div");
        temp.innerHTML = t;
        const svg = temp.querySelector("svg");
        this.#svgCache.set(src, svg);
        return svg;
      }));
    return this.#svgCache.get(src);
  }
}
