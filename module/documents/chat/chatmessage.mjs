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

  /** @override */
  async getHTML(...T) {
    const html = await super.getHTML(...T);

    if (this.type === "usage") await this.system.adjustHTML(html[0]);

    return html;
  }
}
