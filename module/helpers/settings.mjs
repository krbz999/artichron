export function registerSettings() {
  const id = "artichron";

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

  // The percentage a token must overlap a template to be considered 'inside' it.
  game.settings.register(id, "templateAreaThreshold", {
    scope: "world",
    requiresReload: true,
    type: Number,
    default: 0.4,
    config: true,
    name: "ARTICHRON.Setting.TemplateAreaThreshold",
    hint: "ARTICHRON.Setting.TemplateAreaThresholdHint"
  });

  // The length of the token bars (between 90 and 180).
  game.settings.register(id, "tokenBarLength", {
    scope: "world",
    requiresReload: false,
    type: Number,
    default: 120,
    config: true,
    name: "ARTICHRON.Setting.TokenBarLength",
    hint: "ARTICHRON.Setting.TokenBarLengthHint"
  });
}
