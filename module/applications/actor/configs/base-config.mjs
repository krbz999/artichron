const {HandlebarsApplicationMixin, DocumentSheetV2} = foundry.applications.api;
export default class BaseConfig extends HandlebarsApplicationMixin(DocumentSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron"],
    sheetConfig: false,
    position: {
      width: 300,
      height: "auto"
    },
    form: {
      handler: this.#onSubmitDocumentForm,
      closeOnSubmit: true
    }
  };

  /** @override */
  static PARTS = {
    form: {
      id: "form",
      template: undefined // must be subclassed
    }
  };

  /** @override */
  get title() {
    throw new Error("Subclasses of BaseConfig must override the title getter.");
  }

  /**
   * Update the document.
   * @this BaseConfig
   * @param {Event} event                   Initiating click event.
   * @param {HTMLElement} form              The relevant form.
   * @param {FormDataExtended} formData     The form data.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated actor.
   */
  static async #onSubmitDocumentForm(event, form, formData) {
    const submitData = this._prepareSubmitData(event, form, formData);
    return this.document.update(submitData);
  }

  /** @override */
  _prepareSubmitData(event, form, formData) {
    return formData.object;
  }
}
