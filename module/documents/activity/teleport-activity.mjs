import BaseActivity from "./base-activity.mjs";

const {NumberField, SchemaField} = foundry.data.fields;

export default class TeleportActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze({
    type: "teleport",
    label: "ARTICHRON.ACTIVITY.Types.Teleport"
  });

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

  /**
   * Teleport a token targeted by this activity.
   * @param {object} [config]                       Configuration object.
   * @param {number} [config.increase]              The increase in distance of the teleport.
   * @returns {Promise<TokenDocumentArtichron>}     A promise that resolves to the updated token document.
   */
  async teleportToken({increase = 0} = {}) {
    const token = this.item.token;
    if (!token) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoToken", {localize: true});
      return;
    }

    const drawCircle = () => {
      const range = this.teleport.distance + increase
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
    const config = {tokens: [token.document]};
    const place = await artichron.canvas.TokenPlacement.place(config);
    token.removeChild(circle);
    if (!place.length) return;
    const {x, y, rotation} = place[0];
    return token.document.update({x, y, rotation}, {animate: false, teleport: true, forced: true});
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  get chatButtons() {
    const buttons = super.chatButtons;
    buttons.unshift({
      action: "teleport",
      label: game.i18n.localize("ARTICHRON.ACTIVITY.Buttons.Teleport")
    });
    return buttons;
  }
}
