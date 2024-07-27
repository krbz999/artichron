import {ArtichronSheetMixin} from "../base-sheet.mjs";

export default class EffectSheetArtichron extends ArtichronSheetMixin(foundry.applications.api.DocumentSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    form: {submitOnChange: true, closeOnSubmit: false},
    classes: ["effect"],
    position: {width: 500, height: "auto"},
    actions: {
      addChange: this.#onAddChange,
      deleteChange: this.#onDeleteChange
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/shared/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/shared/tabs.hbs"},
    details: {template: "systems/artichron/templates/effect-config/tab-details.hbs", scrollable: [""]},
    changes: {template: "systems/artichron/templates/effect-config/tab-changes.hbs", scrollable: [".changes"]}
  };

  /* -------------------------------------------------- */

  /** @override */
  static TABS = {
    details: {id: "details", group: "primary", label: "ARTICHRON.SheetTab.EffectDetails"},
    changes: {id: "changes", group: "primary", label: "ARTICHRON.SheetTab.EffectChanges"}
  };

  /* -------------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "details"
  };

  /* -------------------------------------------------- */

  /** @override */
  _sheetMode = this.constructor.SHEET_MODES.EDIT;

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const doc = this.document;
    const rollData = doc.getRollData();

    const makeField = path => {
      const [head, ...tail] = path.split(".");
      let field;
      if (head === "system") {
        field = this.document.system.schema.getField(tail.join("."));
      } else {
        field = this.document.schema.getField(path);
      }
      const value = foundry.utils.getProperty(this.document, path);

      return {field, value};
    };

    const context = {
      document: doc,
      header: {
        img: doc.img,
        name: doc.name
      },
      fields: {
        tint: makeField("tint"),
        disabled: makeField("disabled"),
        transfer: {
          ...makeField("transfer"),
          show: (doc.type === "buff") || (doc.type === "base")
        },
        description: {
          enriched: await TextEditor.enrichHTML(doc.description, {relativeTo: doc, rollData: rollData}),
          uuid: doc.uuid,
          ...makeField("description")
        },
        combat: makeField("duration.combat")
      },
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode,
      isEditable: this.isEditable,
      tabs: this._getTabs()
    };

    // Subtype field.
    if (this.document.system?.schema) {
      context.fields.subtype = makeField("system.subtype");
      context.fields.expiration = makeField("system.expiration.type");
    }

    // Changes options
    const c = CONFIG[(doc.type === "fusion") ? "Item" : "Actor"];
    const choices = c.dataModels[context.fields.subtype?.value]?.BONUS_FIELDS.reduce((acc, k) => {
      const schema = c.dataModels[context.fields.subtype.value].schema;
      const path = k.replace("system.", "");
      const field = schema.getField(path);

      let label;
      if (field?.label) label = game.i18n.localize(field.label);
      else if (k === "name") label = game.i18n.localize("Name");
      else if (k === "img") label = game.i18n.localize("Image");
      else label = k;

      let group;
      if (path.startsWith("skills")) group = "Skills";
      else if (path.startsWith("resistances")) group = "Resistances";
      else if (path.startsWith("pools")) group = "Pools";
      else if (path.startsWith("damage.bonuses")) group = "Damage Bonus";

      acc.push({group, value: k, label});

      return acc;
    }, []);
    if (choices) choices.sort((a, b) => {
      if (a.group && b.group) return a.group.localeCompare(b.group);
      return 0;
    });

    const modeChoices = Object.entries(CONST.ACTIVE_EFFECT_MODES).reduce((obj, e) => {
      obj[e[1]] = game.i18n.localize(`EFFECT.MODE_${e[0]}`);
      return obj;
    }, {});

    const fields = {
      key: this.document.schema.getField("changes.element.key"),
      mode: this.document.schema.getField("changes.element.mode"),
      value: this.document.schema.getField("changes.element.value")
    };

    context.changes = doc.changes.map((c, idx) => {
      return {
        idx: idx,
        key: {
          name: `changes.${idx}.key`,
          value: c.key,
          options: choices,
          disabled: context.isPlayMode,
          field: fields.key
        },
        mode: {
          name: `changes.${idx}.mode`,
          value: c.mode,
          choices: modeChoices,
          disabled: context.isPlayMode,
          field: fields.mode
        },
        value: {
          name: `changes.${idx}.value`,
          value: c.value,
          disabled: context.isPlayMode,
          field: fields.value
        }
      };
    });

    return context;
  }

  /* -------------------------------------------------- */
  /*   Event Handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle click events to add a new Change to this effect.
   * @this {EffectSheetArtichron}
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static #onAddChange(event, target) {
    if (!this.isEditable) return;
    const changes = foundry.utils.deepClone(this.document.changes);
    changes.push({key: "", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: ""});
    this.document.update({changes: changes});
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to remove a Change from this effect.
   * @this {EffectSheetArtichron}
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static #onDeleteChange(event, target) {
    if (!this.isEditable) return;
    const idx = parseInt(target.closest("[data-idx]").dataset.idx);
    const changes = foundry.utils.deepClone(this.document.changes);
    changes.splice(idx, 1);
    this.document.update({changes: changes});
  }
}
