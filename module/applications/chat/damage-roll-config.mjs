export class DamageRollConfig extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300,
      classes: ["artichron", "dialog", "damage-roll-config"],
      template: "systems/artichron/templates/chat/damage-roll-config.hbs",
      closeOnSubmit: false
    });
  }

  /** @constructor */
  constructor(item, options = {}) {
    super(item, options);
    this.item = item;
    this.actor = item.actor;
    this.resolve = options.resolve;
  }

  /** @override */
  get title() {
    return `${this.actor.name}: ${game.i18n.localize("ARTICHRON.DamageRoll")}`;
  }

  /** @override */
  async getData(options = {}) {
    return {
      rolls: this.item.system.damage,
      damageTypes: CONFIG.SYSTEM.DAMAGE_TYPES
    };
  }

  /** @override */
  async _onChangeInput(event) {
    await super._onChangeInput(event);
    if (event.currentTarget.type !== "checkbox") return;
    event.currentTarget.closest(".form-group").querySelectorAll("INPUT[type=text], SELECT").forEach(n => {
      n.disabled = !event.currentTarget.checked;
    });
  }

  /** @override */
  async _updateObject(event, formData) {
    this.resolve?.(formData);
    this.close();
  }

  /** @override */
  async close(...args) {
    this.resolve?.(null);
    return super.close(...args);
  }

  /**
   * Factory method to create and await the callback from an instance of this class.
   * @param {ItemArtichron} item
   * @returns {Promise<*>}
   */
  static async create(item) {
    return new Promise(resolve => {
      const fn = (data) => resolve(Object.values(foundry.utils.expandObject(data)?.system?.damage ?? {}));
      new this(item, {resolve: fn}).render(true);
    });
  }
}
