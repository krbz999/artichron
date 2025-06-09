import ChatMessageSystemModel from "./system-model.mjs";

const { ArrayField, DocumentUUIDField, StringField } = foundry.data.fields;

export default class UsageMessageData extends ChatMessageSystemModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      activity: new StringField(),
      item: new DocumentUUIDField({ type: "Item", embedded: true }),
      targets: new ArrayField(new StringField()),
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

  /** @inheritdoc */
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

  /** @inheritdoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if (this.#hookId) Hooks.off("controlToken", this.#hookId);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async adjustHTML(html) {
    await super.adjustHTML(html);

    const content = html.querySelector(".message-content");
    content.innerHTML = "";
    await this.#insertItemHeader(html);

    const message = this.parent;

    if (this.parent.rolls.length) await this.#insertDamageHealingRolls(content);
    if (message.isDamage || message.isHealing || message.isEffect) {
      await this.#insertDamageApplication(content);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Insert an item detail element if this message has an item.
   * @param {HTMLElement} html    The html being modified.
   */
  async #insertItemHeader(html) {
    const item = this.item;
    const activity = item?.getEmbeddedDocument("Activity", this.activity);

    if (!item) return;

    const container = document.createElement("DIV");
    container.classList.add("item-details");

    const itemHeader = document.createElement("DIV");
    itemHeader.classList.add("item-header");
    itemHeader.addEventListener("click", () => container.classList.toggle("expanded"));

    const text = activity?.description ? activity.description : item.system.description.value;

    const enriched = await foundry.applications.ux.TextEditor.enrichHTML(text, {
      rollData: this.item.getRollData(), relativeTo: this.item,
    });
    itemHeader.innerHTML = `
    <img class="icon" src="${item.img}" alt="${item.name}">
    <div class="details">
      <span class="title">${item.name}</span>
      ${activity ? `<span class="subtitle">${activity.name}</span>` : ""}
    </div>`;
    container.insertAdjacentElement("beforeend", itemHeader);
    if (enriched) container.insertAdjacentHTML("beforeend", `<div class="description">${enriched}</div>`);

    html.querySelector(".message-content")?.insertAdjacentElement("beforeend", container);
  }

  /* -------------------------------------------------- */

  /**
   * Inject the array of roll parts to the html.
   * @param {HTMLElement} content   The dialog content element.
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
        ({ label, color, icon } = artichron.config.DAMAGE_TYPES[roll.type]);
      } else if (this.parent.isHealing) {
        icon = "fa-solid fa-staff-snake";
        label = "ARTICHRON.Healing";
        color = "438364";
      } else {
        icon = "fa-solid fa-shield-alt";
      }

      const { formula, total, dice } = roll;
      return {
        color, icon, formula, total, label,
        multiplier: (roll.multiplier !== 1) ? roll.multiplier.toNearest(0.01) : null,
        pills: [
          roll.undefendable ? "Undefendable" : null,
          roll.irreducible ? "Irreducible" : null,
        ].filter(_ => _),
        dice: dice.flatMap(die => {
          const dice = [];
          for (const result of die.results) {
            const cssClasses = [
              "die",
              `d${die.faces}`,
              (result.result === 1) ? "min" : null,
              (result.result === die.faces) ? "max" : null,
            ];
            dice.push({ cssClasses: cssClasses.filterJoin(" "), total: result.result });
          }
          return dice;
        }),
      };
    });
    content.insertAdjacentHTML("beforeend", await foundry.applications.handlebars.renderTemplate(template, context));
    content.querySelector(".wrapper").addEventListener("click", event => event.currentTarget.classList.toggle("expanded"));
  }

  /* -------------------------------------------------- */

  /**
   * Inject the damage application elements.
   * @param {HTMLElement} content   The dialog content element.
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
      label: this.parent.isDamage ?
        "ARTICHRON.ACTIVITY.Buttons.ApplyDamage" :
        this.parent.isHealing ?
          "ARTICHRON.ACTIVITY.Buttons.ApplyHealing" :
          "ARTICHRON.ACTIVITY.Buttons.ApplyEffects",
    };
    content.insertAdjacentHTML("beforeend", await foundry.applications.handlebars.renderTemplate(template, context));

    const type = this.parent.flags.artichron.type;
    const tag = "token-target";

    // Selected
    const makeSelectedTarget = token => {
      const actor = token.actor;
      if (!actor) return;
      const wrapper = content.querySelector(".targets[data-tab=selected]");
      if (Array.from(wrapper.querySelectorAll(tag)).some(element => element.actor === actor)) return;
      const element = document.createElement(tag);
      element.dataset.type = type;
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
        element.dataset.type = type;
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
    content.querySelector("[data-action=apply]").addEventListener("click", async (event) => {
      const wrapper = event.currentTarget.closest(".targets-wrapper");
      const nav = wrapper.querySelector(".header .expanded");
      const tab = wrapper.querySelector(`.targets[data-tab="${nav.dataset.tab}"]`);
      const elements = tab.querySelectorAll(tag);
      nav.classList.toggle("expanded", false);
      tab.classList.toggle("expanded", false);
      for (const element of elements) await element.apply();
    });
  }
}
