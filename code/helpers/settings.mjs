const {
  BooleanField, ForeignDocumentField,
} = foundry.data.fields;

export default function registerSettings() {
  // Client setting for saving the collapsed state of the combat tracker.
  game.settings.register("artichron", "combatTrackerCollapsed", {
    scope: "client",
    requiresReload: false,
    type: new BooleanField({ initial: false }),
    config: false,
  });

  /* -------------------------------------------------- */

  class PrimaryPartyModel extends foundry.abstract.DataModel {
    /** @inheritdoc */
    static defineSchema() {
      return { actor: new ForeignDocumentField(foundry.documents.BaseActor, {
        blank: true,
        validate: id => !game.actors || (game.actors.get(id)?.type === "party"),
        validationError: "This is not a valid id for a Party-type actor.",
      }) };
    }
  }

  // Storing the primary party's id.
  game.settings.register("artichron", "primaryParty", {
    name: "Primary Party",
    scope: "world",
    requiresReload: false,
    type: PrimaryPartyModel,
    default: null,
    config: false,
    onChange: () => ui.actors.render(),
  });

  /* -------------------------------------------------- */

  // Color scheme has to always be dark mode for now.
  Hooks.once("setup", () => {
    const obj = { ...game.settings.get("core", "uiConfig") };
    obj.colorScheme = "dark";
    game.settings.set("core", "uiConfig", obj);
  });
}
