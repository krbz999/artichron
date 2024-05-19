import {DamageRoll} from "../../dice/damage-roll.mjs";
import MeasuredTemplateArtichron from "../template/template.mjs";

export default class ChatMessageArtichron extends ChatMessage {
  async createMeasuredTemplate(count = 1) {
    const templateData = this.flags.artichron?.use?.templateData;
    const {item, actor} = this;
    const token = item?.token;
    if (!token || !item?.isOwner || !actor?.isOwner || !templateData) return null;

    const templates = [];
    const initialLayer = canvas.activeLayer;
    for (let i = 0; i < count; i++) {
      const template = await MeasuredTemplateArtichron.fromToken(token, templateData).drawPreview();
      if (template) templates.push(template);
      else break;
    }
    initialLayer.activate();
    return templates;
  }

  get item() {
    return this.system.item;
  }

  get actor() {
    return this.system.actor;
  }

  get isBuff() {
    const item = this.item;
    return (item?.type === "spell") && (item.system.category.subtype === "buff");
  }

  get isDamage() {
    return this.rolls.some(roll => roll instanceof DamageRoll);
  }

  /** @override */
  async getHTML(...T) {
    const html = await super.getHTML(...T);

    const uuids = this.flags.artichron?.use?.targetUuids ?? [];
    if (!uuids.length) return html;

    const tagName = this.isBuff ? "buff-target" : this.isDamage ? "damage-target" : "";
    const [toggle, targets] = html[0].querySelectorAll(".wrapper .toggle, .wrapper .targets");
    for (const uuid of uuids) {
      const element = document.createElement(tagName);
      element.dataset.actorUuid = uuid;
      targets.appendChild(element);
    }
    toggle.addEventListener("click", event => {
      event.currentTarget.closest(".wrapper").classList.toggle("expanded");
    });

    return html;
  }
}
