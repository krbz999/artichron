import {ArtichronSheetMixin} from "../base-sheet.mjs";

export default class EffectSheetArtichron extends ArtichronSheetMixin(foundry.applications.api.DocumentSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    form: {submitOnChange: false, closeOnSubmit: true},
    classes: ["artichron", "effect"],
    position: {width: 500, height: "auto"},
    actions: {
      addChange: this._onAddChange,
      deleteChange: this._onDeleteChange
    }
  };

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/partials/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/partials/tabs.hbs"},
    details: {template: "systems/artichron/templates/effect-config/tab-details.hbs"},
    duration: {template: "systems/artichron/templates/effect-config/tab-duration.hbs"},
    changes: {template: "systems/artichron/templates/effect-config/tab-changes.hbs"},
    footer: {template: "systems/artichron/templates/effect-config/footer.hbs"}
  };

  /** @override */
  static TABS = {
    details: {id: "details", group: "primary", label: "ARTICHRON.SheetTab.EffectDetails"},
    duration: {id: "duration", group: "primary", label: "ARTICHRON.SheetTab.EffectDuration"},
    changes: {id: "changes", group: "primary", label: "ARTICHRON.SheetTab.EffectChanges"}
  };

  /** @override */
  tabGroups = {
    primary: "details"
  };

  /** @override */
  _sheetMode = this.constructor.SHEET_MODES.EDIT;

  /** @override */
  async _prepareContext(options) {
    const doc = this.document;
    const rollData = doc.getRollData();

    const context = {
      document: doc,
      header: {
        img: doc.img,
        name: doc.name
      },
      fields: {
        tint: {
          field: doc.schema.getField("tint"),
          value: doc.tint
        },
        description: {
          enriched: await TextEditor.enrichHTML(doc.description, {relativeTo: doc, rollData: rollData}),
          field: doc.schema.getField("description"),
          value: doc.description,
          uuid: doc.uuid
        },
        disabled: {
          field: doc.schema.getField("disabled"),
          value: doc.disabled
        }
      },
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode,
      isFusion: doc.type === "fusion",
      tabs: this._getTabs(),
      changes: doc.changes.map((c, i) => {
        return {...c, priority: c.priority ?? 20, idx: i};
      }),
      changeModes: Object.entries(CONST.ACTIVE_EFFECT_MODES).reduce((obj, e) => {
        obj[e[1]] = game.i18n.localize(`EFFECT.MODE_${e[0]}`);
        return obj;
      }, {})
    };

    if (!context.isFusion && (this.document.parent instanceof Item)) {
      context.fields.transfer = {
        field: doc.schema.getField("transfer"),
        value: doc.transfer,
        label: "EFFECT.Transfer",
        hint: "EFFECT.TransferHint"
      };
    }

    // Duration.
    context.fields.duration = {
      combat: {
        field: doc.schema.getField("duration.combat"),
        value: doc.duration.combat,
        disabled: true
      },
      type: {
        field: doc.system.schema.getField("duration.type"),
        value: doc.system.duration.type
      }
    };

    return context;
  }

  /** @override */
  _prepareSubmitData(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    if (data.changes) data.changes = Array.from(Object.values(data.changes || {}));
    data.statuses ??= [];
    return data;
  }

  /* -------------------------------------------- */
  /*                EVENT HANDLERS                */
  /* -------------------------------------------- */

  static _onAddChange(event, target) {
    const idx = this.document.changes.length;
    const change = {
      key: "",
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: ""
    };
    let formData = foundry.utils.expandObject(new FormDataExtended(event.currentTarget).object);
    foundry.utils.setProperty(formData, `changes.${idx}`, change);
    formData = foundry.utils.flattenObject(formData);
    this.document.update(formData);
  }

  static _onDeleteChange(event, target) {
    target.closest(".form-group").remove();
    this._onSubmitForm({...this.options.form, closeOnSubmit: false}, event);
  }

  async _renderInner(...args) {
    // TODO
    const jq = await super._renderInner(...args);
    const html = jq[0];
    if (this.document.type !== "fusion") return jq;
    const choices = Array.from(this.document.system.BONUS_FIELDS).reduce((acc, k) => {
      acc[k] = k;
      return acc;
    }, {});
    html.querySelectorAll("[name^='changes.'][name$='.key']").forEach(n => {
      const div = document.createElement("DIV");
      div.innerHTML = `<select name="${n.name}">` + HandlebarsHelpers.selectOptions(choices, {hash: {
        selected: n.value, blank: "", sort: true
      }}) + "</select>";
      n.replaceWith(div.firstElementChild);
    });
    return jq;
  }
}
