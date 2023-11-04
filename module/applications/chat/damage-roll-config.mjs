import {DamageRollCombined} from "../../dice/damage-roll.mjs";

export class DamageRollConfig extends Dialog {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300,
      classes: ["artichron", "dialog", "damage-roll-config"]
    });
  }

  /** @constructor */
  constructor(item, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.item = item;
    this.actor = item.actor;
    this.rolls = item.toObject().system.damage;
  }

  /** @override */
  get title() {
    return `${this.actor.name}: ${game.i18n.localize("ARTICHRON.DamageRoll")}`;
  }

  /** @override */
  async getData(options = {}) {
    const data = await super.getData(options);
    data.content = await renderTemplate("systems/artichron/templates/chat/damage-roll-config.hbs", {
      rolls: this.rolls, damageTypes: CONFIG.SYSTEM.DAMAGE_TYPES
    });
    return data;
  }

  /**
   * Factory method to create and await the callback from an instance of this class.
   * @param {ItemArtichron} item
   * @returns {Promise<*>}
   */
  static async create(item) {
    return new Promise(resolve => {
      new this(item, {
        buttons: {
          confirm: {
            icon: `<i class="fa-solid fa-burst"></i>`,
            label: game.i18n.localize("ARTICHRON.Roll"),
            callback: html => {
              const fd = new FormDataExtended(html[0].querySelector("form"), {readonly: true});
              resolve(Object.values(foundry.utils.expandObject(fd.object)));
            }
          }
        },
        default: "confirm",
        close: () => resolve(null)
      }).render(true);
    });
  }

  /**
   * Create a combined damage roll from an array of rolls.
   * @param {object[]} rolls
   * @param {boolean} [rolls[].active]      If explictly false, this entry in the array will be skipped.
   * @param {string} rolls[].type           A damage type from `SYSTEM.DAMAGE_TYPES`.
   * @param {string} rolls[].value          A roll's damage formula.
   * @param {object} rollData               Roll data object to evaluate the rolls.
   * @returns {DamageRollCombined}
   */
  static fromArray(rolls, rollData) {
    rolls = rolls.filter(dmg => {
      return (dmg.active !== false) && (dmg.type in CONFIG.SYSTEM.DAMAGE_TYPES) && Roll.validate(dmg.value);
    });
    return new DamageRollCombined(rolls, rollData);
  }
}
