export class DamageRollConfig extends Dialog {
  constructor(item, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.options.classes = ["artichron", "dialog", "damage-roll-config"];
    this.item = item;
    this.actor = item.actor;
    this.rolls = item.toObject().system.damage;
  }

  get title() {
    return `${this.actor.name}: ${game.i18n.localize("ARTICHRON.DamageRoll")}`;
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    data.content = await renderTemplate("systems/artichron/templates/chat/damage-roll-config.hbs", {
      rolls: this.rolls, damageTypes: CONFIG.SYSTEM.DAMAGE_TYPES
    });
    return data;
  }

  static async create(item) {
    return new Promise(resolve => {
      new this(item, {
        buttons: {
          confirm: {
            icon: `<i class="fa-solid fa-burst"></i>`,
            label: game.i18n.localize("ARTICHRON.Roll"),
            callback: html => {
              const fd = new FormDataExtended(html[0].querySelector("form"), {readonly: true});
              resolve(fd.object);
            }
          }
        },
        default: "confirm",
        close: () => resolve(null)
      }).render(true);
    });
  }
}
