import BaseActivity from "./base-activity.mjs";

const { NumberField, SchemaField } = foundry.data.fields;

export default class TeleportActivity extends BaseActivity {
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
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ACTIVITY.TELEPORT",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async use() {
    const token = this.item.token;
    if (!token) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoToken", { localize: true });
      return;
    }

    const actor = this.item.actor;

    const drawCircle = () => {
      const range = this.teleport.distance
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
    const place = await artichron.canvas.placement.TokenPlacement.place({ tokens: [token.document] });
    token.removeChild(circle);
    if (!place.length) return null;
    const { x, y, rotation } = place[0];

    token.document.update({ x, y, rotation }, { animate: false, teleport: true, forced: true });

    const Cls = foundry.utils.getDocumentClass("ChatMessage");
    const messageData = {
      type: "teleport",
      speaker: Cls.getSpeaker({ actor: actor }),
      "system.activity": this.uuid,
    };
    Cls.applyRollMode(messageData, game.settings.get("core", "rollMode"));
    return Cls.create(messageData);
  }
}
