import MeasuredTemplateArtichron from "../template/template.mjs";

export default class ChatMessageArtichron extends ChatMessage {
  async createMeasuredTemplate() {
    const {templateData} = this.flags.artichron ?? {};
    const {item, actor} = this;
    const token = item?.token;
    if (!token || !item?.isOwner || !actor?.isOwner || !templateData) return null;

    return MeasuredTemplateArtichron.fromToken(token, templateData).drawPreview();
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
    return fromUuidSync(this.flags.artichron?.itemUuid);
  }

  get actor() {
    return fromUuidSync(this.flags.artichron?.actorUuid);
  }
}
