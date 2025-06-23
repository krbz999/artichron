import BaseAdvancement from "./base-advancement.mjs";

const { NumberField, SchemaField, SetField, StringField, TypedObjectField } = foundry.data.fields;

export default class TraitAdvancement extends BaseAdvancement {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      requirements: new SchemaField({
        points: new NumberField({ integer: true, min: 1, nullable: false, initial: 1 }),
      }),
      traits: new TypedObjectField(new SchemaField({
        label: new StringField({ required: true }),
        trait: new StringField({ required: true, blank: false, choices: () => artichron.config.TRAITS }),
        value: new StringField({ required: true, blank: true }),
      }), { validateKey: key => foundry.data.validators.isValidId(key) }),
      // If `null`, then this is explicitly a "receive all" - but also if the number is equal to or greater than the pool
      chooseN: new NumberField({ integer: true, nullable: true, initial: null, min: 1 }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "trait";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ADVANCEMENT.TRAIT",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return [this.requirements.points];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Set default labels for trait options.
    for (const k in this.traits) {
      if (!this.traits[k].label) {
        this.traits[k].label = artichron.config.TRAITS[this.traits[k].trait].label;
      }
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async configureAdvancement() {
    const traits = Object.entries(this.traits);

    if (!traits.length) {
      throw new Error(`The trait advancement [${this.uuid}] has no available choices configured.`);
    }

    const chooseN = (this.chooseN === null) || (this.chooseN >= traits.length) ? null : this.chooseN;

    const path = `flags.artichron.advancement.${this.id}.selected`;
    if (chooseN === null) return { [path]: traits.map(trait => trait[0]) };

    const item = this.document;
    const chosen = item.isEmbedded ? foundry.utils.getProperty(item, path) ?? [] : [];

    const content = [];
    for (const [traitId, trait] of traits) {
      const fgroup = foundry.applications.fields.createFormGroup({
        label: trait.label,
        input: foundry.utils.parseHTML(`<input type="checkbox" value="${traitId}" name="choices" ${chosen.includes(traitId) ? "checked" : ""}>`),
      });
      content.push(fgroup);
    }

    function render(event, dialog) {
      const checkboxes = dialog.element.querySelectorAll("input[name=choices]");
      const submit = dialog.element.querySelector(".form-footer [type=submit]");
      for (const checkbox of checkboxes) {
        checkbox.addEventListener("change", () => {
          const count = Array.from(checkboxes).reduce((acc, checkbox) => acc + checkbox.checked, 0);
          for (const checkbox of checkboxes) checkbox.disabled = !checkbox.checked && (count >= chooseN);
          submit.disabled = count !== chooseN;
        });
      }
      checkboxes[0].dispatchEvent(new Event("change"));
    }

    const selection = await artichron.applications.api.Dialog.input({
      render,
      content: content.map(fgroup => fgroup.outerHTML).join(""),
    });

    if (!selection) return null;
    const traitIds = Array.isArray(selection.choices) ? selection.choices : [selection.choices];

    return { [path]: traitIds.filter(_ => _) };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static async configureNode(node) {
    const options = Object.entries(node.advancement.traits)
      .filter(([k, v]) => v.trait in artichron.config.TRAITS)
      .map(([k, v]) => ({
        value: k,
        label: v.label,
        selected: node.selected[k] === true,
      }));
    const input = foundry.applications.fields.createMultiSelectInput({
      options,
      name: "traits",
      type: "checkboxes",
    });
    const result = await artichron.applications.api.Dialog.input({
      content: input.outerHTML,
    });
    if (!result) return false;
    for (const { value: k } of options) node.selected[k] = result.traits.includes(k);
    return true;
  }
}
