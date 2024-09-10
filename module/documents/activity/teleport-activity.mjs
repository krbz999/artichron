import ActivityUseDialog from "../../applications/item/activity-use-dialog.mjs";
import BaseActivity from "./base-activity.mjs";
import ChatMessageArtichron from "../chat-message.mjs";

const {NumberField, SchemaField} = foundry.data.fields;

export default class TeleportActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    type: "teleport",
    label: "ARTICHRON.ACTIVITY.Types.Teleport"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      teleport: new SchemaField({
        distance: new NumberField({min: 1, integer: true, nullable: false, initial: 1})
      })
    });
  }

  /* -------------------------------------------------- */

  /** @override */
  async use() {
    const token = this.item.token;
    if (!token) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoToken", {localize: true});
      return;
    }

    const configuration = await ActivityUseDialog.create(this);
    if (!configuration) return null;

    const config = foundry.utils.mergeObject({
      distance: 0,
      elixirs: [],
      rollMode: game.settings.get("core", "rollMode")
    }, configuration);

    const item = this.item;
    const actor = this.item.actor;

    const drawCircle = () => {
      const range = this.teleport.distance + config.distance
      + (canvas.grid.distance * Math.max(token.document.width, token.document.height, 1) / 2);
      const points = canvas.grid.getCircle({x: 0, y: 0}, range).reduce((acc, p) => {
        return acc.concat([p.x, p.y]);
      }, []);
      const circle = new PIXI.Graphics();
      circle.lineStyle({width: 4, color: 0x000000, alpha: 1});
      circle.drawShape(new PIXI.Polygon(points));
      circle.pivot.set(token.document.x - token.center.x, token.document.y - token.center.y);
      token.addChild(circle);
      return circle;
    };

    const circle = drawCircle();
    const place = await artichron.canvas.TokenPlacement.place({tokens: [token.document]});
    token.removeChild(circle);
    if (!place.length) return null;
    const {x, y, rotation} = place[0];

    const consumed = await this.consume({
      pool: config.distance,
      elixirs: config.elixirs
    });
    if (!consumed) return null;

    token.document.update({x, y, rotation}, {animate: false, teleport: true, forced: true});

    const messageData = {
      type: "usage",
      speaker: ChatMessageArtichron.getSpeaker({actor: actor}),
      "system.activity": this.id,
      "system.item": item.uuid,
      "system.targets": [],
      "flags.artichron.usage": config,
      "flags.artichron.type": this.constructor.metadata.type
    };
    ChatMessageArtichron.applyRollMode(messageData, config.rollMode);
    return ChatMessageArtichron.create(messageData);
  }
}
