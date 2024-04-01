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
    const isSpell = this.item.isSpell;
    const isWeapon = this.item.isMelee || this.item.isRanged || this.item.isShield;
    return {
      rolls: this.item.system.damage,
      damageTypes: CONFIG.SYSTEM.DAMAGE_TYPES,
      isSpell: isSpell,
      isWeapon: isWeapon,
      manaOptions: isSpell ? this._getPoolOptions("mana") : null,
      staminaOptions: isWeapon ? this._getPoolOptions("stamina") : null
    };
  }

  _getPoolOptions(type) {
    const pool = this.item.actor.system.pools[type];
    return Object.fromEntries(Array.fromRange(pool.value, 1).map(n => {
      return [n, game.i18n.format(`ARTICHRON.${type.capitalize()}DieCount${n > 1 ? "Pl" : ""}`, {count: n})];
    }));
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
  _getSubmitData(updateData = {}) {
    if (!this.form) throw new Error("The FormApplication subclass has no registered form element");
    const fd = new FormDataExtended(this.form, {readonly: true, editors: this.editors});
    let data = fd.object;
    if (updateData) data = foundry.utils.flattenObject(foundry.utils.mergeObject(data, updateData));
    return data;
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
      const fn = (data) => {
        if (!data) resolve(null);
        const damage = Object.values(foundry.utils.expandObject(data)?.system?.damage ?? {});
        return resolve({...data, damage});
      };
      new this(item, {resolve: fn}).render(true);
    });
  }
}
