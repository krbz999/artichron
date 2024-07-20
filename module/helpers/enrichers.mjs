export function registerEnrichers() {
  CONFIG.TextEditor.enrichers.push({
    // Lookup.
    pattern: /\[\[(?<type>lookup) (?<config>[^\]]+)]](?:{(?<label>[^}]+)})?/gi,
    enricher: enrichString
  });
}

/* -------------------------------------------------- */

async function enrichString(match, options) {
  let {type, config, label} = match.groups;
  config = parseConfig(config);
  config._input = match[0];
  switch (type.toLowerCase()) {
    case "lookup": return enrichLookup(config, label, options);
  }
  return null;
}

/* -------------------------------------------------- */

function parseConfig(match) {
  const config = {_config: match, values: []};
  for (const part of match.match(/(?:[^\s"]+|"[^"]*")+/g)) {
    if (!part) continue;
    const [key, value] = part.split("=");
    const valueLower = value?.toLowerCase();
    if (value === undefined) config.values.push(key.replace(/(^"|"$)/g, ""));
    else if (["true", "false"].includes(valueLower)) config[key] = valueLower === "true";
    else if (Number.isNumeric(value)) config[key] = Number(value);
    else config[key] = value.replace(/(^"|"$)/g, "");
  }
  return config;
}

/* -------------------------------------------------- */

function enrichLookup(config, fallback, options) {
  if (options.relativeTo instanceof JournalEntryPage) return;
  let keyPath = config.path;
  let style = config.style;
  for (const value of config.values) {
    if (value === "capitalize") style ??= "capitalize";
    else if (value === "lowercase") style ??= "lowercase";
    else if (value === "uppercase") style ??= "uppercase";
    else if (value.startsWith("@")) keyPath ??= value;
  }

  if (!keyPath) {
    console.warn(`Lookup path must be defined to enrich ${config._input}.`);
    return null;
  }

  const data = options.relativeTo?.getRollData();
  let value = foundry.utils.getProperty(data, keyPath.substring(1)) ?? fallback;
  if (value && style) {
    if (style === "capitalize") value = value.capitalize();
    else if (style === "lowercase") value = value.toLowerCase();
    else if (style === "uppercase") value = value.toUpperCase();
  }

  const span = document.createElement("span");
  span.classList.add("lookup-value");
  if (!value) span.classList.add("not-found");
  span.innerText = value ?? keyPath;
  return span;
}
