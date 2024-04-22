const {DocumentUUIDField} = foundry.data.fields;

class ForeignDocumentUUIDField extends DocumentUUIDField {
  initialize(value, model, options = {}) {
    if (!value || value.startsWith("Compendium")) return null;
    return () => fromUuidSync(value);
  }
}

export class ChatMessageSystemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      actor: new ForeignDocumentUUIDField({type: "Actor"}),
      item: new ForeignDocumentUUIDField({type: "Item"})
    };
  }
}

export class DamageMessageData extends ChatMessageSystemModel {
  static defineSchema() {
    return {...super.defineSchema()};
  }
}
