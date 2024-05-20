import {DamageRoll} from "../../dice/damage-roll.mjs";

const {SetField, StringField, DocumentUUIDField} = foundry.data.fields;

class ForeignDocumentUUIDField extends DocumentUUIDField {
  initialize(value, model, options = {}) {
    if (!value || value.startsWith("Compendium")) return null;
    return () => fromUuidSync(value);
  }
}

export class ChatMessageSystemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      actor: new ForeignDocumentUUIDField({type: "Actor"}),
      item: new ForeignDocumentUUIDField({type: "Item"})
    };
  }
}

export class ItemMessageData extends ChatMessageSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      targets: new SetField(new StringField({required: true})),
      effect: new ForeignDocumentUUIDField({type: "ActiveEffect", embedded: true})
    };
  }

  /**
   * Make system-specific adjustments to the chat message when created by an item.
   * @param {HTMLElement} html      The default html.
   */
  async adjustHTML(html) {
    const {templateData} = this.parent.flags.artichron?.use ?? {};
    const {item, actor, targets, effect} = this;

    const formatRoll = async (roll) => {
      return {
        formula: roll.formula,
        tooltip: await roll.getTooltip(),
        config: CONFIG.SYSTEM.DAMAGE_TYPES[roll.options.type],
        total: roll.total
      };
    };
    const rolls = await Promise.all(this.parent.rolls.map(formatRoll));

    const hbs = "systems/artichron/templates/chat/item-message.hbs";
    const content = await renderTemplate(hbs, {
      item, actor, targets, effect, rolls, templateData
    });
    html.querySelector(".message-content").innerHTML = content;

    // Add button event listeners.
    html.querySelectorAll("[data-action]").forEach(n => {
      const m = this.parent;
      switch (n.dataset.action) {
        case "applyDamage": n.addEventListener("click", this._onApplyDamage.bind(m)); break;
        case "placeTemplate": n.addEventListener("click", this._onPlaceTemplate.bind(m)); break;
        case "grantBuff": n.addEventListener("click", this._onGrantBuff.bind(m)); break;
        default: break;
      }
    });

    let tag;
    if (this.parent.rolls.some(roll => roll instanceof DamageRoll)) tag = "damage-target";
    else if (effect) tag = "buff-target";

    if (!tag) return;
    const [toggle, collapsible] = html.querySelectorAll(".wrapper .toggle, .wrapper .targets");
    for (const target of targets) {
      const element = document.createElement(tag);
      element.dataset.actorUuid = target;
      collapsible.appendChild(element);
    }
    toggle.addEventListener("click", event => event.currentTarget.closest(".wrapper").classList.toggle("expanded"));
  }

  /**
   * Dispatch a click event on all damage targets.
   * @this ChatMessage
   * @param {Event} event     Initiating click event.
   */
  _onApplyDamage(event) {
    event.currentTarget.closest(".artichron.item-usage").querySelectorAll("damage-target").forEach(n => n.execute());
  }

  /**
   * Create a measured template from data embedded in a chat message, then perform a damage roll.
   * @this ChatMessage
   * @param {Event} event     Initiating click event.
   */
  async _onPlaceTemplate(event) {
    const count = this.flags.artichron.use.templateData.count;
    const templates = await this.createMeasuredTemplate(count);
    if (!templates) return null;

    await Promise.all(templates.map(template => template.waitForShape()));

    const uuids = new Set(this.system.targets);
    for (const template of templates) for (const token of template.object.containedTokens) {
      const uuid = token.actor?.uuid;
      if (uuid) uuids.add(uuid);
    }

    this.update({"system.targets": Array.from(uuids)});
  }

  /**
   * Transfer buffs to targets.
   * @this ChatMessage
   * @param {Event} event     Initiating click event.
   */
  async _onGrantBuff(event) {
    event.currentTarget.closest("[data-message-id]").querySelectorAll("buff-target").forEach(n => n.execute());
  }
}
