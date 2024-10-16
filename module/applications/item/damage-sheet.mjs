import BaseActivity from "../../documents/activity/base-activity.mjs";
import DamageFormulaModel from "../../documents/fields/damage-formula-model.mjs";
import ItemArtichron from "../../documents/item.mjs";

export default class DamageSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor({damage, ...options} = {}) {
    options.damageId = damage.id;
    super(options);
    this.#activityId = damage.activity.id;
    this.#item = damage.activity.item;
  }

  /* -------------------------------------------------- */
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron"],
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-burst"
    },
    position: {
      width: 400,
      height: "auto"
    },
    form: {
      handler: DamageSheet.#onSubmitForm,
      submitOnChange: true
    },
    tag: "form",
    damageId: null
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    form: {
      template: "systems/artichron/templates/item/damage-sheet.hbs"
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.DamagePartSheet.title", {
      name: this.activity.name
    });
  }

  /* -------------------------------------------------- */

  /**
   * The parent activity of this damage part.
   * @type {BaseActivity}
   */
  get activity() {
    return this.#item.system.activities.get(this.#activityId);
  }

  /* -------------------------------------------------- */

  /**
   * The id of the activity this damage part resides on.
   * @type {string}
   */
  #activityId;

  /* -------------------------------------------------- */

  /**
   * The item that has the activity this resides on.
   * @type {ItemArtichron}
   */
  #item;

  /* -------------------------------------------------- */

  /**
   * The damage part.
   * @type {DamageFormulaModel}
   */
  get damage() {
    return this.activity.damage.get(this.options.damageId);
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const damage = this.damage;
    const makeField = field => {
      const value = foundry.utils.getProperty(damage, field.fieldPath);
      const disabled = !this.#item.sheet.isEditable;
      return {field, value, disabled};
    };

    const fields = [...damage.schema].filter(field => !field.readonly).map(makeField);

    return {
      fields: fields
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.#item.apps[this.id] = this;
  }

  /* -------------------------------------------------- */

  /** @override */
  _close(_options) {
    delete this.#item.apps[this.id];
  }

  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   * @this {DamageSheet}
   * @param {PointerEvent} event            Originating click event.
   * @param {HTMLElement} form              The form element.
   * @param {FormDataExtended} formData     The form data.
   */
  static #onSubmitForm(event, form, formData) {
    const submitData = foundry.utils.expandObject(formData.object);
    this.activity.update({[`damage.${this.options.damageId}`]: submitData});
  }
}
