const {
  BooleanField, ForeignDocumentField, NumberField,
} = foundry.data.fields;

export default function registerSettings() {
  const id = "artichron";

  /* -------------------------------------------------- */

  // Are tokens treated as circular for the purpose of their hit area?
  game.settings.register(id, "circularTokens", {
    scope: "world",
    requiresReload: true,
    type: new BooleanField({ initial: true }),
    config: true,
    name: "ARTICHRON.Setting.CircularTokens",
    hint: "ARTICHRON.Setting.CircularTokensHint",
  });

  /* -------------------------------------------------- */

  // The percentage a token must overlap a template to be considered 'inside' it.
  game.settings.register(id, "templateAreaThreshold", {
    scope: "world",
    requiresReload: true,
    type: new NumberField({ initial: 0.4, min: 0.1, max: 1, step: 0.1, nullable: false }),
    config: true,
    name: "ARTICHRON.Setting.TemplateAreaThreshold",
    hint: "ARTICHRON.Setting.TemplateAreaThresholdHint",
  });

  /* -------------------------------------------------- */

  // The length of the token bars (between 45 and 180).
  game.settings.register(id, "tokenBarLength", {
    scope: "world",
    requiresReload: false,
    type: new NumberField({ initial: 120, min: 45, max: 180, step: 5, nullable: false }),
    config: true,
    name: "ARTICHRON.Setting.TokenBarLength",
    hint: "ARTICHRON.Setting.TokenBarLengthHint",
  });

  /* -------------------------------------------------- */

  // Client setting for saving the collapsed state of the combat tracker.
  game.settings.register(id, "combatTrackerCollapsed", {
    scope: "client",
    requiresReload: false,
    type: new BooleanField({ initial: false }),
    config: false,
  });

  /* -------------------------------------------------- */

  // Client setting for whether actors have compact or wide inventory view.
  game.settings.register(id, "compactItems", {
    scope: "client",
    requiresReload: false,
    type: new BooleanField({ initial: true }),
    config: true,
    name: "ARTICHRON.Setting.CompactItems",
    hint: "ARTICHRON.Setting.CompactItemsHint",
    onChange: (compact) => {
      for (const [k, v] of foundry.applications.instances.entries()) {
        if (v.document instanceof Actor) v.render();
      }
    },
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
  game.settings.register(id, "primaryParty", {
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
