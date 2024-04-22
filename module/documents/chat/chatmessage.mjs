import MeasuredTemplateArtichron from "../template/template.mjs";

export default class ChatMessageArtichron extends ChatMessage {
  async createMeasuredTemplate(count = 1) {
    const {templateData} = this.flags.artichron ?? {};
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

  async applyDamage() {
    let actors = new Set();
    const tokens = canvas.tokens.controlled;
    if (tokens.length) {
      for (const token of tokens) if (token.actor) actors.add(token.actor);
    } else {
      actors = this.flags.artichron.targets.map(uuid => fromUuidSync(uuid)?.actor);
      actors = actors.filter(actor => actor?.isOwner);
    }
    actors.forEach(actor => actor.applyDamage(this.flags.artichron.totals));
  }

  get item() {
    return this.system.item;
  }

  get actor() {
    return this.system.actor;
  }
}
