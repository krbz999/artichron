export default class BatteryProgressElement extends foundry.applications.elements.AbstractFormInputElement {
  /**
   * Factory method for handlebar helper.
   */
  static create(config) {
    const element = document.createElement(BatteryProgressElement.tagName);
    element.name = config.name;

    for (const attr of ["value", "min", "max", "rgb"]) {
      if (attr in config) element.setAttribute(attr, config[attr]);
    }
    foundry.applications.fields.setInputAttributes(element, config);
    return element;
  }

  /* -------------------------------------------------- */

  constructor() {
    super();
    this.#min = Number(this.getAttribute("min")) ?? 0;
    this.#max = Number(this.getAttribute("max")) ?? 1;
    this._setValue(Number(this.getAttribute("value"))); // Initialize existing value
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static tagName = "battery-progress";

  /* -------------------------------------------------- */

  /**
   * The numeric input element.
   * @type {HTMLInputElement}
   */
  #input = null;

  /* -------------------------------------------------- */

  /**
   * The container element for the bars.
   * @type {HTMLDivElement}
   */
  #bars = null;

  /* -------------------------------------------------- */

  /**
   * The minimum allowed value for the input.
   * @type {number}
   */
  #min;

  /* -------------------------------------------------- */

  /**
   * The maximum allowed value for the input.
   * @type {number}
   */
  #max;

  /* -------------------------------------------------- */

  get valueAsNumber() {
    return this._getValue();
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @override */
  _toggleDisabled(disabled) {
    this.#input.disabled = disabled;
  }

  /* -------------------------------------------------- */

  /** @override */
  _refresh() {
    if (!this.#input) return;
    this.#input.valueAsNumber = this._value;
  }

  /* -------------------------------------------------- */

  /** @override */
  _setValue(value) {
    value = Math.clamp(value, this.#min, this.#max);
    this._value = value.toNearest(1);
  }

  /* -------------------------------------------------- */

  /** @override */
  _buildElements() {
    const max = parseInt(this.getAttribute("max"));
    const value = Math.min(parseInt(this.getAttribute("value")), max);

    if (this.hasAttribute("rgb")) this.setAttribute("style", `--rgb: ${this.getAttribute("rgb")}`);

    const input = this.#input = document.createElement("INPUT");
    input.classList.add("value", "delta");
    input.type = "number";
    input.min = String(this.#min);
    input.max = String(this.#max);
    input.step = 1;
    this._applyInputAttributes(input);

    const bars = this.#bars = document.createElement("DIV");
    bars.classList.add("bars");
    bars.setAttribute("style", `--max: ${max}`);

    for (let i = 0; i < max; i++) {
      const bar = document.createElement("SPAN");
      bar.classList.add("bar");
      if (i < value) bar.classList.add("filled");
      bars.insertAdjacentElement("beforeend", bar);
    }

    return [bars, input];
  }

  /* -------------------------------------------------- */

  /** @override */
  _activateListeners() {
    this.#input.addEventListener("change", this.#onChangeInput.bind(this));
    this.#input.addEventListener("input", this.#onInput.bind(this));
    this.#bars.addEventListener("click", this.#onClickBars.bind(this));
  }

  /* -------------------------------------------------- */
  /*   Event listeners                                  */
  /* -------------------------------------------------- */

  /**
   * Handle changes to the direct input.
   * @param {InputEvent} event      The originating input change event.
   */
  #onChangeInput(event) {
    event.stopPropagation();
    this.value = event.currentTarget.valueAsNumber;
  }

  /* -------------------------------------------------- */

  /**
   * Handle input events to the numeric input field.
   * @param {InputEvent} event      Initiating input event.
   */
  #onInput(event) {
    event.preventDefault();
    const previewedValue = event.currentTarget.valueAsNumber;
    const value = this.valueAsNumber;

    if (previewedValue >= value) {
      const bars = Array.from(this.#bars.querySelectorAll(".bar"));
      for (let i = this.#max; i > 0; i--) {
        const bar = bars[i - 1];
        bar.classList.toggle("preview", (i > value) && (i <= previewedValue));
      }
    } else {
      const bars = Array.from(this.#bars.querySelectorAll(".bar"));
      for (let i = this.#max; i > 0; i--) {
        const bar = bars[i - 1];
        bar.classList.toggle("preview", (i > previewedValue) && (i <= value));
      }
    }
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events on the bars element.
   * @param {PointerEvent} event     The originating click event.
   */
  #onClickBars(event) {
    const target = event.target;
    if (this.disabled || !target?.classList.contains("bar")) return;
    const idx = Array.from(event.currentTarget.querySelectorAll(".bar")).indexOf(event.target);
    this.value = idx + (event.target.classList.contains("filled") ? 0 : 1);
  }
}
