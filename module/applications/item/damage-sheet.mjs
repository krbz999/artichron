import BaseActivity from "../../documents/activity/base-activity.mjs";
import DamageFormulaModel from "../../documents/data/damage-formula-model.mjs";
import ItemArtichron from "../../documents/item.mjs";

export default class DamageSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor(options = {}) {
    options.damageId = options.damage.id;
    super(options);
    this.#activityId = options.document.activity.id;
    this.#item = options.document.activity.item;
  }

  /* -------------------------------------------------- */
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron"],
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-burst",
    },
    position: {
      width: 400,
      height: "auto",
    },
    form: {
      handler: DamageSheet.#onSubmitForm,
      submitOnChange: true,
    },
    tag: "form",
    document: null,
    damageId: null,
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    damage: {
      template: "systems/artichron/templates/item/damage-sheet-damage.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.SHEET.DAMAGE_PART.title", {
      name: this.activity.name,
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
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    if (partId === "damage") {
      const damage = this.damage;
      const makeField = field => {
        const value = foundry.utils.getProperty(damage, field.fieldPath);
        const disabled = !this.#item.sheet.isEditable;

        const data = { field, value, disabled };

        if (field instanceof foundry.data.fields.SetField) {
          data.classes = "stacked";
          data.type = "checkboxes";
        }

        if (field.name === "type") data.options = CONFIG.SYSTEM.DAMAGE_TYPES.optgroups;

        return data;
      };

      const damageFields = [...damage.schema].filter(field => {
        return !field.readonly && !(field instanceof foundry.data.fields.SchemaField);
      }).map(makeField);

      context.damageFields = damageFields;
    }

    return context;
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
    this.activity.update({ [`damage.${this.options.damageId}`]: submitData });
  }
}
