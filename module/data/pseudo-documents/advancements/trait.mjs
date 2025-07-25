import BaseAdvancement from "./base-advancement.mjs";

const { NumberField, SchemaField, StringField, TypedObjectField } = foundry.data.fields;

export default class TraitAdvancement extends BaseAdvancement {
  /** @inheritdoc */
  static get metadata() {
    const metadata = super.metadata;
    return {
      ...metadata,
      embedded: {
        ...metadata.embedded,
        TraitChoice: "traits",
      },
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      requirements: new SchemaField({
        points: new NumberField({ integer: true, min: 1, nullable: false, initial: 1 }),
      }),
      traits: new artichron.data.fields.CollectionField(artichron.data.pseudoDocuments.traitChoices.BaseTraitChoice),
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

  /**
   * Does this trait have a choice to make? This can be done synchronously unlike
   * for item grant advancements, so we can make use of a getter directly on the advancement here.
   * @type {boolean}
   */
  get isChoice() {
    if (this.chooseN === null) return false;
    if (this.chooseN >= this.traits.size) return false;
    return true;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async configureAdvancement(node = null) {
    const traits = node ? node.advancement.traits : this.traits;

    if (!traits.size) {
      throw new Error(`The trait advancement [${this.uuid}] has no available choices configured.`);
    }

    const chooseN = (this.chooseN === null) || (this.chooseN >= traits.length) ? null : this.chooseN;

    const path = `flags.artichron.advancement.${this.id}.selected`;
    if (!this.isChoice) return { [path]: traits.map(trait => trait.id) };

    const item = this.document;
    const chosen = node
      ? traits.filter(trait => node.selected[trait.id])
      : item.isEmbedded
        ? foundry.utils.getProperty(item, path) ?? []
        : [];

    const content = [];
    for (const trait of traits) {
      const fgroup = foundry.applications.fields.createFormGroup({
        label: trait.name,
        input: foundry.utils.parseHTML(`<input type="checkbox" value="${trait.id}" name="choices" ${chosen.includes(trait.id) ? "checked" : ""}>`),
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

    if (node) {
      node.selected = {};
      for (const trait of traits) node.selected[trait.id] = selection.choices.includes(trait.id);
    }

    return { [path]: traitIds.filter(_ => _) };
  }
}
