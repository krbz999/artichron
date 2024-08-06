export function registerSettings() {
  const id = "artichron";

  /* -------------------------------------------------- */

  // Are tokens treated as circular for the purpose of their hit area?
  game.settings.register(id, "circularTokens", {
    scope: "world",
    requiresReload: true,
    type: Boolean,
    default: true,
    config: true,
    name: "ARTICHRON.Setting.CircularTokens",
    hint: "ARTICHRON.Setting.CircularTokensHint"
  });

  /* -------------------------------------------------- */

  // The percentage a token must overlap a template to be considered 'inside' it.
  game.settings.register(id, "templateAreaThreshold", {
    scope: "world",
    requiresReload: true,
    type: new foundry.data.fields.NumberField({
      initial: 0.4, min: 0.1, max: 1, step: 0.1, nullable: false
    }),
    config: true,
    name: "ARTICHRON.Setting.TemplateAreaThreshold",
    hint: "ARTICHRON.Setting.TemplateAreaThresholdHint"
  });

  /* -------------------------------------------------- */

  // The length of the token bars (between 45 and 180).
  game.settings.register(id, "tokenBarLength", {
    scope: "world",
    requiresReload: false,
    type: new foundry.data.fields.NumberField({
      initial: 120, min: 45, max: 180, step: 5, nullable: false
    }),
    config: true,
    name: "ARTICHRON.Setting.TokenBarLength",
    hint: "ARTICHRON.Setting.TokenBarLengthHint"
  });

  /* -------------------------------------------------- */

  // Client setting for saving the collapsed state of the combat tracker.
  game.settings.register(id, "combatTrackerCollapsed", {
    scope: "client",
    requiresReload: false,
    type: new foundry.data.fields.BooleanField({initial: false}),
    config: false
  });

  /* -------------------------------------------------- */

  // Client setting for whether actors have compact or wide inventory view.
  game.settings.register(id, "compactItems", {
    scope: "client",
    requiresReload: false,
    type: new foundry.data.fields.BooleanField({initial: true}),
    config: true,
    name: "ARTICHRON.Setting.CompactItems",
    hint: "ARTICHRON.Setting.CompactItemsHint",
    onChange: (compact) => {
      for (const [k, v] of foundry.applications.instances.entries()) {
        if (v.document instanceof Actor) v.render();
      }
    }
  });

  /* -------------------------------------------------- */

  // Color scheme has to always be dark mode for now.
  Hooks.once("setup", () => game.settings.set("core", "colorScheme", "dark"));
}
