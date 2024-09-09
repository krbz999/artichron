import ChatMessageSystemModel from "./system-model.mjs";

const {ArrayField, DocumentUUIDField, StringField} = foundry.data.fields;

export default class UsageMessageData extends ChatMessageSystemModel {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ChatMessageSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "usage"
  });

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      activity: new StringField(),
      item: new DocumentUUIDField({type: "Item", embedded: true}),
      targets: new ArrayField(new StringField())
    };
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Reference to the hook id for injecting selected tokens.
   * @type {number}
   */
  #hookId = null;

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

  /** @override */
  async adjustHTML(html) {
    await super.adjustHTML(html);

    const content = html.querySelector(".message-content");
    content.innerHTML = "";
    await this._insertItemHeader(html);

    if (this.parent.isDamage) {
      this.#insertDamageHealingRolls(content);
      await this.#insertDamageApplication(content);
    } else if (this.parent.isHealing) {
      this.#insertDamageHealingRolls(content);
      await this.#insertDamageApplication(content);
    }
  }

  /**
   * Inject the array of roll parts to the html.
   * @param {HTMLElement} content     The dialog content element.
   */
  async #insertDamageHealingRolls(content) {
    const template = "systems/artichron/templates/chat/item-usage-message.hbs";
    const context = {};
    context.total = 0;
    context.rolls = this.parent.rolls.map(roll => {
      context.total += roll.total;

      let icon;
      let label;
      let color;

      if (this.parent.isDamage) {
        ({label, color, icon} = CONFIG.SYSTEM.DAMAGE_TYPES[roll.type]);
      } else {
        // healing
        icon = "fa-solid fa-staff-snake";
        label = "ARTICHRON.Healing";
        color = "438364";
      }

      const {formula, total, dice} = roll;
      return {
        color, icon, formula, total, label,
        dice: dice.flatMap(die => {
          const dice = [];
          for (const result of die.results) {
            const cssClasses = [
              "die",
              `d${die.faces}`,
              (result.result === 1) ? "min" : null,
              (result.result === die.faces) ? "max" : null
            ];
            dice.push({cssClasses: cssClasses.filterJoin(" "), total: result.result});
          }
          return dice;
        })
      };
    });
    content.insertAdjacentHTML("beforeend", await renderTemplate(template, context));
    content.querySelector(".wrapper").addEventListener("click", event => event.currentTarget.classList.toggle("expanded"));
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
    const context = {
      targets: targets,
      label: this.parent.isDamage ? "ARTICHRON.ROLL.ApplyDamage" : "ARTICHRON.ROLL.ApplyHealing"
    };
    content.insertAdjacentHTML("beforeend", await renderTemplate(template, context));

    const tag = this.parent.isDamage ? "damage-target" : "healing-target";

    // Selected
    const makeSelectedTarget = token => {
      const actor = token.actor;
      if (!actor) return;
      const wrapper = content.querySelector(".targets[data-tab=selected]");
      if (Array.from(wrapper.querySelectorAll(tag)).some(element => element.actor === actor)) return;
      const element = document.createElement(tag);
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
        const element = document.createElement(tag);
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
    content.querySelector("[data-action=applyDamage]").addEventListener("click", async (event) => {
      const wrapper = event.currentTarget.closest(".targets-wrapper");
      const nav = wrapper.querySelector(".header .expanded");
      const tab = wrapper.querySelector(`.targets[data-tab="${nav.dataset.tab}"]`);
      const elements = tab.querySelectorAll(tag);
      nav.classList.toggle("expanded", false);
      tab.classList.toggle("expanded", false);
      for (const element of elements) {
        if (this.parent.isDamage) await element.actor.applyDamage(element.damages);
        else await element.actor.applyHealing(element.healing);
      }
    });
  }
}
