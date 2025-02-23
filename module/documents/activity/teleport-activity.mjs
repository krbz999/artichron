import BaseActivity from "./base-activity.mjs";
import ChatMessageArtichron from "../chat-message.mjs";

const { NumberField, SchemaField } = foundry.data.fields;

export default class TeleportActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    label: "ARTICHRON.ACTIVITY.Types.Teleport",
  }, { inplace: false }));

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      teleport: new SchemaField({
        distance: new NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
      }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "teleport";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async use(usage = {}, dialog = {}, message = {}) {
    const token = this.item.token;
    if (!token) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoToken", { localize: true });
      return;
    }

    const configuration = await this.configure(usage, dialog, message);
    if (!configuration) return null;

    const item = this.item;
    const actor = this.item.actor;

    const drawCircle = () => {
      const range = this.teleport.distance + (configuration.usage.teleport.increase ?? 0)
      + (canvas.grid.distance * Math.max(token.document.width, token.document.height, 1) / 2);
      const points = canvas.grid.getCircle({ x: 0, y: 0 }, range).reduce((acc, p) => {
        return acc.concat([p.x, p.y]);
      }, []);
      const circle = new PIXI.Graphics();
      circle.lineStyle({ width: 4, color: 0x000000, alpha: 1 });
      circle.drawShape(new PIXI.Polygon(points));
      circle.pivot.set(token.document.x - token.center.x, token.document.y - token.center.y);
      token.addChild(circle);
      return circle;
    };

    const circle = drawCircle();
    const place = await artichron.canvas.TokenPlacement.place({ tokens: [token.document] });
    token.removeChild(circle);
    if (!place.length) return null;
    const { x, y, rotation } = place[0];

    const consumed = await this.consume(configuration.usage);
    if (!consumed) return null;

    token.document.update({ x, y, rotation }, { animate: false, teleport: true, forced: true });

    const messageData = {
      type: "usage",
      speaker: ChatMessageArtichron.getSpeaker({ actor: actor }),
      "system.activity": this.id,
      "system.item": item.uuid,
      "system.targets": [],
      "flags.artichron.usage": configuration.usage,
      "flags.artichron.type": TeleportActivity.metadata.type,
    };
    ChatMessageArtichron.applyRollMode(messageData, configuration.usage.rollMode.mode);
    foundry.utils.mergeObject(messageData, configuration.message);
    return ChatMessageArtichron.create(messageData);
  }
}
