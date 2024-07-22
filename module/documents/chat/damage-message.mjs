import ChatMessageSystemModel from "./system-model.mjs";

const {ArrayField, DocumentUUIDField, StringField} = foundry.data.fields;

export default class DamageMessageData extends ChatMessageSystemModel {
  /** @override */
  static defineSchema() {
    return {
      item: new DocumentUUIDField({type: "Item", embedded: true}),
      targets: new ArrayField(new StringField())
    };
  }

  /* -------------------------------------------------- */
  /*   Data preparation                                 */
  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    try {
      const item = this.item.startsWith("Compendium") ? null : fromUuidSync(this.item);
      this.item = item ? item : null;
    } catch (err) {
      this.item = null;
    }

    this.#prepareDamages();
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the object of damage types descriptions.
   */
  #prepareDamages() {
    this.#damages = this.parent.rolls.reduce((acc, roll) => {
      acc[roll.options.type] ??= {value: 0};
      acc[roll.options.type].value += roll.total;
      return acc;
    }, {});
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The damage totals by type.
   * @type {object}
   */
  #damages = null;

  /* -------------------------------------------------- */

  /**
   * The damage totals by type.
   * @type {object}
   */
  get damages() {
    if (!this.#damages) this.#prepareDamages();
    return this.#damages;
  }

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @override */
  async adjustHTML(html) {
    await super.adjustHTML(html);

    const content = html.querySelector(".message-content");
    content.innerHTML = "";

    this.#insertRolls(content);

    if (!this.item) return;

    await this.#insertDamageApplication(content);
  }

  /* -------------------------------------------------- */

  /**
   * Inject the array of roll parts to the html.
   * @param {HTMLElement} content     The dialog content element.
   */
  #insertRolls(content) {
    const dtypes = CONFIG.SYSTEM.DAMAGE_TYPES;

    const wrapper = document.createElement("DIV");
    wrapper.classList.add("wrapper");
    content.insertAdjacentElement("beforeend", wrapper);

    const label = document.createElement("HEADER");
    label.classList.add("header");
    const total = Object.values(this.#damages).reduce((acc, k) => acc + k.value, 0);
    label.textContent = String(total);
    label.addEventListener("click", event => wrapper.classList.toggle("expanded"));
    wrapper.insertAdjacentElement("beforeend", label);

    const innerWrapper = document.createElement("DIV");
    innerWrapper.classList.add("rolls");

    for (const roll of this.parent.rolls) {
      const {label, color, icon} = dtypes[roll.type];
      const {formula, total, dice} = roll;
      const element = document.createElement("DIV");
      element.classList.add("roll");

      // Top half
      const top = document.createElement("DIV");
      top.classList.add("top");
      const iconElement = document.createElement("SPAN");
      iconElement.classList.add("icon");
      iconElement.dataset.tooltip = label;
      iconElement.innerHTML = `<i class="fa-fw ${icon}" style="color: #${color}"></i>`;
      top.insertAdjacentElement("beforeend", iconElement);
      const formulaElement = document.createElement("SPAN");
      formulaElement.textContent = formula;
      formulaElement.classList.add("formula");
      top.insertAdjacentElement("beforeend", formulaElement);
      const totalElement = document.createElement("SPAN");
      totalElement.classList.add("total");
      totalElement.textContent = String(total);
      top.insertAdjacentElement("beforeend", totalElement);
      element.insertAdjacentElement("beforeend", top);

      // Bottom half
      if (dice.length) {
        const bottom = document.createElement("DIV");
        bottom.classList.add("bottom");
        for (const die of dice) {
          for (const {result} of die.results) {
            const dieElement = document.createElement("DIV");
            dieElement.classList.add("die", `d${die.faces}`);
            if (result === 1) dieElement.classList.add("min");
            else if (result === die.faces) dieElement.classList.add("max");
            dieElement.textContent = String(result);
            bottom.insertAdjacentElement("beforeend", dieElement);
          }
        }
        element.insertAdjacentElement("beforeend", bottom);
      }

      innerWrapper.insertAdjacentElement("beforeend", element);
    }

    wrapper.insertAdjacentElement("beforeend", innerWrapper);
    content.insertAdjacentElement("beforeend", wrapper);
  }

  /* -------------------------------------------------- */

  /**
   * Inject the damage application elements.
   * @param {HTMLElement} content     The dialog content element.
   */
  async #insertDamageApplication(content) {
    const promises = this.targets.map(uuid => fromUuid(uuid));
    const actors = await Promise.all(promises);
    const targets = actors.reduce((acc, actor) => {
      if (actor) acc.add(actor);
      return acc;
    }, new Set());

    if (targets.size) {
      // outer wrapper
      const targeting = document.createElement("DIV");
      targeting.classList.add("wrapper", "expanded");

      // Click Me label
      const header = document.createElement("HEADER");
      header.classList.add("toggle");
      header.textContent = "Targets";
      header.addEventListener("click", event => targeting.classList.toggle("expanded"));
      targeting.insertAdjacentElement("beforeend", header);

      // inner wrapper
      const collapsible = document.createElement("DIV");
      collapsible.classList.add("targets");
      targeting.insertAdjacentElement("beforeend", collapsible);
      for (const target of targets) {
        const element = document.createElement("damage-target");
        element.actor = target;
        collapsible.insertAdjacentElement("beforeend", element);
      }

      // apply button
      const button = document.createElement("BUTTON");
      button.textContent = "Apply Damage";
      button.addEventListener("click", event => {
        for (const element of button.closest(".wrapper").querySelectorAll("damage-target")) {
          element.actor.applyDamage(element.damages);
        }
        targeting.classList.toggle("expanded", false);
      });
      collapsible.insertAdjacentElement("beforeend", button);

      content.insertAdjacentElement("beforeend", targeting);
    }
  }
}
