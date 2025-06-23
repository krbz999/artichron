import BaseAdvancement from "./base-advancement.mjs";

const {
  ArrayField, DocumentUUIDField, NumberField, SchemaField,
} = foundry.data.fields;

export default class ItemGrantAdvancement extends BaseAdvancement {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      requirements: new SchemaField({
        // How many points are required to unlock this
        points: new NumberField({ integer: true, min: 1, nullable: false, initial: 1 }),
      }),
      pool: new ArrayField(new SchemaField({
        uuid: new DocumentUUIDField({ embedded: false, type: "Item" }),
      })),
      // If `null`, then this is explicitly a "receive all" - but also if the number is equal to or greater than the pool
      chooseN: new NumberField({ integer: true, nullable: true, initial: null, min: 1 }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "itemGrant";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ADVANCEMENT.ITEM_GRANT",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return [this.requirements.points];
  }

  /* -------------------------------------------------- */

  /**
   * Find all items on an actor that were granted by this specific advancement.
   * @returns {foundry.documents.Item[]|null}
   */
  grantedItems() {
    const item = this.document;
    if (!item.isEmbedded) return null;

    return item.collection.filter(i => {
      if (i === item) return false;
      const { advancementId, itemId } = i.getFlag("artichron", "advancement") ?? {};
      return (itemId === item.id) && (advancementId === this.id);
    });
  }

  /* -------------------------------------------------- */

  /**
   * Find all items on an actor that would be removed were this advancement undone (e.g. the item deleted).
   * @returns {foundry.documents.Item[]}    An array of to-be-deleted items.
   */
  grantedItemsChain() {
    const items = this.grantedItems();
    for (const item of [...items]) {
      if (!item.supportsAdvancements) continue;
      for (const advancement of item.getEmbeddedPseudoDocumentCollection("Advancement").getByType("itemGrant")) {
        items.push(...advancement.grantedItemsChain());
      }
    }
    return items;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async configureAdvancement() {
    const items = (await Promise.all(this.pool.map(p => fromUuid(p.uuid)))).filter(_ => _);

    if (!items.length) {
      throw new Error(`The item grant advancement [${this.uuid}] has no available items configured.`);
    }

    const chooseN = (this.chooseN === null) || (this.chooseN >= items.length) ? null : this.chooseN;

    const path = `flags.artichron.advancement.${this.id}.selected`;
    if (chooseN === null) return { [path]: items.map(item => item.uuid) };

    const item = this.document;
    const chosen = item.isEmbedded ? foundry.utils.getProperty(item, path) ?? [] : [];

    const content = [];
    for (const item of items) {
      const fgroup = foundry.applications.fields.createFormGroup({
        label: item.toAnchor().outerHTML,
        input: foundry.utils.parseHTML(`<input type="checkbox" value="${item.uuid}" name="choices" ${chosen.includes(item.uuid) ? "checked" : ""}>`),
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
    const uuids = Array.isArray(selection.choices) ? selection.choices : [selection.choices];

    return { [path]: uuids.filter(_ => _) };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static async configureNode(node) {
    const options = Object.values(node.choices).map(choice => ({
      value: choice.item.uuid,
      label: choice.item.name,
      selected: node.selected[choice.item.uuid] === true,
    }));

    const contentLinks = Object.values(node.choices).map(choice => `<li>${choice.item.toAnchor().outerHTML}</li>`).join("");

    const input = foundry.applications.fields.createMultiSelectInput({
      options,
      name: "uuids",
      type: "checkboxes",
    });

    const result = await artichron.applications.api.Dialog.input({
      content: `<ul>${contentLinks}</ul>${input.outerHTML}`,
    });
    if (!result) return false;

    for (const { value: uuid } of options) node.selected[uuid] = result.uuids.includes(uuid);
    return true;
  }
}
