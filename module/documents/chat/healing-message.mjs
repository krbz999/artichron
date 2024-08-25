import ChatMessageSystemModel from "./system-model.mjs";

const {ArrayField, DocumentUUIDField, StringField} = foundry.data.fields;

export default class HealingMessageData extends ChatMessageSystemModel {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ChatMessageSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "healing"
  });

  /* -------------------------------------------------- */

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
  }

  /* -------------------------------------------------- */
  /*   Life-cycle events                                */
  /* -------------------------------------------------- */

  /** @override */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if (this.#hookId) Hooks.off("controlToken", this.#hookId);
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
   * The total amount of healing.
   * @type {number}
   */
  get healing() {
    return this.parent.rolls.reduce((acc, roll) => acc + roll.total, 0);
  }

  /* -------------------------------------------------- */

  /**
   * Reference to the hook id for injecting selected tokens.
   * @type {number}
   */
  #hookId = null;

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @override */
  async adjustHTML(html) {
    await super.adjustHTML(html);

    const content = html.querySelector(".message-content");
    content.innerHTML = "";

    this.#insertRolls(content);

    // if (!this.item) return;

    await this.#insertDamageApplication(content);
  }

  /* -------------------------------------------------- */

  /**
   * Inject the array of roll parts to the html.
   * @param {HTMLElement} content     The dialog content element.
   */
  #insertRolls(content) {
    const wrapper = document.createElement("DIV");
    wrapper.classList.add("wrapper");
    content.insertAdjacentElement("beforeend", wrapper);

    const label = document.createElement("HEADER");
    label.classList.add("header");
    label.textContent = String(this.healing);
    label.addEventListener("click", event => wrapper.classList.toggle("expanded"));
    wrapper.insertAdjacentElement("beforeend", label);

    const innerWrapper = document.createElement("DIV");
    innerWrapper.classList.add("rolls");

    for (const roll of this.parent.rolls) {
      const icon = "fa-solid fa-staff-snake";
      const label = "ARTICHRON.Healing";
      const color = "438364";
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

    const template = "systems/artichron/templates/chat/damage-application.hbs";
    const context = {targets: targets, label: "Apply Healing"};
    content.insertAdjacentHTML("beforeend", await renderTemplate(template, context));

    // Selected
    const makeSelectedTarget = token => {
      const actor = token.actor;
      if (!actor) return;
      const wrapper = content.querySelector(".targets[data-tab=selected]");
      if (Array.from(wrapper.querySelectorAll("healing-target")).some(element => element.actor === actor)) return;
      const element = document.createElement("healing-target");
      element.targeted = false;
      element.actor = actor;
      wrapper.insertAdjacentElement("beforeend", element);
    };
    for (const token of canvas.tokens?.controlled ?? []) makeSelectedTarget(token);
    this.#hookId = Hooks.on("controlToken", (token, selected) => {
      if (selected) makeSelectedTarget(token);
    });

    // Targeted
    if (targets.size) {
      const wrapper = content.querySelector(".targets[data-tab=targeted]");

      // inner wrapper
      for (const target of targets) {
        const element = document.createElement("healing-target");
        element.actor = target;
        wrapper.insertAdjacentElement("beforeend", element);
      }
    }

    // Tab click listeners.
    content.querySelectorAll(".header [data-tab]").forEach(tab => tab.addEventListener("click", event => {
      const nav = event.currentTarget;
      const tab = nav.closest(".targets-wrapper").querySelector(`.targets[data-tab="${nav.dataset.tab}"]`);
      if (nav.classList.contains("expanded")) {
        nav.classList.toggle("expanded", false);
        tab.classList.toggle("expanded", false);
        return;
      }
      for (const child of nav.parentElement.children) {
        child.classList.toggle("expanded", child === nav);
      }
      for (const child of tab.parentElement.children) {
        child.classList.toggle("expanded", child.dataset.tab === nav.dataset.tab);
      }
    }));

    // Button click listener.
    content.querySelector("[data-action=applyDamage]").addEventListener("click", event => {
      const wrapper = event.currentTarget.closest(".targets-wrapper");
      const nav = wrapper.querySelector(".header .expanded");
      const tab = wrapper.querySelector(`.targets[data-tab="${nav.dataset.tab}"]`);
      const elements = tab.querySelectorAll("healing-target");
      for (const element of elements) element.actor.applyHealing(element.healing);
      nav.classList.toggle("expanded", false);
      tab.classList.toggle("expanded", false);
    });
  }
}
