import { registerSockets } from "./module/helpers/sockets.mjs";
import { SYSTEM } from "./module/helpers/config.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as migrations from "./module/helpers/migrations.mjs";
import * as utils from "./module/helpers/utils.mjs";
import activities from "./module/documents/activity/_module.mjs";
import applications from "./module/applications/_module.mjs";
import canvas from "./module/documents/canvas/_module.mjs";
import dice from "./module/dice/_module.mjs";
import elements from "./module/elements/_module.mjs";
import fields from "./module/documents/fields/_module.mjs";
import registerEnrichers from "./module/helpers/enrichers.mjs";
import registerSettings from "./module/helpers/settings.mjs";

// Custom elements.
for (const element of Object.values(elements)) {
  window.customElements.define(element.tagName, element);
}

/* -------------------------------------------------- */
/*   Define module structure                          */
/* -------------------------------------------------- */

globalThis.artichron = {
  activities: activities,
  applications: applications,
  canvas: canvas,
  config: SYSTEM,
  dataModels: documents.dataModels,
  dice: dice,
  documents: documents.documentClasses,
  elements: elements,
  fields: fields,
  migrations: migrations,
  tooltips: new applications.TooltipsArtichron(),
  utils: utils,
};

/* -------------------------------------------------- */
/*   Init hook                                        */
/* -------------------------------------------------- */

Hooks.once("init", function() {
  registerSettings();
  registerEnrichers();
  registerSockets();
  CONFIG.Canvas.dispositionColors.CONTROLLED = 2502655;

  // Record Configuration Values
  CONFIG.SYSTEM = SYSTEM;
  CONFIG.Token.hudClass = applications.hud.TokenHUDArtichron;
  CONFIG.Token.objectClass = canvas.TokenArtichron;
  CONFIG.Token.rulerClass = canvas.TokenRulerArtichron;
  CONFIG.ui.chat = applications.ChatLogArtichron;

  // Hook up document classes.
  for (const [k, v] of Object.entries(documents.documentClasses)) {
    CONFIG[k].documentClass = v;
  }

  // Hook up system data types.
  for (const [key, dm] of Object.entries(documents.dataModels)) {
    Object.assign(CONFIG[key].dataModels, dm);

    for (const [k, v] of Object.entries(dm)) {
      CONFIG[key].typeIcons[k] = v.metadata.icon;
    }
  }

  // Hook up dice types.
  CONFIG.Dice.rolls[0] = dice.RollArtichron;
  CONFIG.Dice.rolls.push(dice.DamageRoll);
  CONFIG.Dice.Roll = dice.RollArtichron;
  CONFIG.Dice.DamageRoll = dice.DamageRoll;

  // Set system combat tracker application.
  CONFIG.ui.combat = applications.CombatTrackerArtichron;

  // Register sheet application classes
  const configureSheet = (scope, { DocumentClass, SheetClass, options = {} }) => {
    const config = foundry.applications.apps.DocumentSheetConfig;
    switch (scope) {
      case "core":
        return config.unregisterSheet(DocumentClass, scope, SheetClass);
      case "artichron":
        return config.registerSheet(DocumentClass, scope, SheetClass, options);
    }
  };

  const sheets = {
    core: [
      { DocumentClass: Actor, SheetClass: ActorSheet },
      { DocumentClass: Item, SheetClass: ItemSheet },
      { DocumentClass: ActiveEffect, SheetClass: foundry.applications.sheets.ActiveEffectConfig },
    ],
    artichron: [
      {
        DocumentClass: Actor,
        SheetClass: applications.HeroSheet,
        options: { makeDefault: true, label: "ARTICHRON.SHEET.ACTOR.Hero", types: ["hero"] },
      },
      {
        DocumentClass: Actor,
        SheetClass: applications.MonsterSheet,
        options: { makeDefault: true, label: "ARTICHRON.SHEET.ACTOR.Monster", types: ["monster"] },
      },
      {
        DocumentClass: Actor,
        SheetClass: applications.MerchantSheet,
        options: { makeDefault: true, label: "ARTICHRON.SHEET.ACTOR.Merchant", types: ["merchant"] },
      },
      {
        DocumentClass: Actor,
        SheetClass: applications.PartySheet,
        options: { makeDefault: true, label: "ARTICHRON.SHEET.ACTOR.Party", types: ["party"] },
      },
      {
        DocumentClass: Item,
        SheetClass: applications.ItemSheetArtichron,
        options: { makeDefault: true, label: "ARTICHRON.SHEET.ITEM.Base", types: ["weapon", "shield", "spell", "armor"] },
      },
      {
        DocumentClass: Item,
        SheetClass: applications.ItemSheetAmmunition,
        options: { makeDefault: true, label: "ARTICHRON.SHEET.ITEM.Ammunition", types: ["ammo"] },
      },
      {
        DocumentClass: Item,
        SheetClass: applications.ItemSheetElixir,
        options: { makeDefault: true, label: "ARTICHRON.SHEET.ITEM.Elixir", types: ["elixir"] },
      },
      {
        DocumentClass: Item,
        SheetClass: applications.ItemSheetPart,
        options: { makeDefault: true, label: "ARTICHRON.SHEET.ITEM.Part", types: ["part"] },
      },
      {
        DocumentClass: ActiveEffect,
        SheetClass: applications.ActiveEffectSheetArtichron,
        options: { makeDefault: true, label: "ARTICHRON.SHEET.EFFECT.Base" },
      },
    ],
  };

  for (const [scope, v] of Object.entries(sheets)) {
    for (const { DocumentClass, SheetClass, options } of v) {
      configureSheet(scope, { DocumentClass, SheetClass, options });
    }
  }

  // Set up conditions.
  CONFIG.statusEffects = [];
  for (const [id, config] of Object.entries(SYSTEM.STATUS_CONDITIONS)) {
    CONFIG.statusEffects.push({ ...config, id: id, _id: utils.staticId(id) });
  }

  CONFIG.specialStatusEffects.DEFEATED = "defeated";
  CONFIG.specialStatusEffects.BURROW = "underground";
  CONFIG.specialStatusEffects.FLY = "flying";
  CONFIG.specialStatusEffects.HOVER = "levitating";
});

/* -------------------------------------------------- */
/*   Setup hook                                       */
/* -------------------------------------------------- */

Hooks.once("setup", function() {
  Handlebars.registerHelper({
    batteryProgress: batteryProgress,
    effectEntry: effectEntry,
    inventoryItem: inventoryItem,
    progressClock: progressClock,
    thresholdBar: thresholdBar,
  });
  artichron.tooltips.observe();
  applications.TooltipsArtichron.activateListeners();
});

/* -------------------------------------------------- */
/*   i18nInit hook                                    */
/* -------------------------------------------------- */

Hooks.once("i18nInit", function() {

  // Localize all strings in the global system configuration object.
  const localize = (o, k, v) => {
    const type = foundry.utils.getType(v);
    if ((type === "string") && v.startsWith("ARTICHRON")) {
      o[k] = game.i18n.localize(v);
    } else if (type === "Object") {
      for (const [x, y] of Object.entries(v)) {
        localize(v, x, y);
      }
    } else if (type === "Array") {
      for (const k of v) if (foundry.utils.getType(k) === "Object") {
        for (const [u, w] of Object.entries(k)) {
          localize(k, u, w);
        }
      }
    }
  };

  for (const [k, v] of Object.entries(CONFIG.SYSTEM)) {
    localize(CONFIG.SYSTEM, k, v);
  }

  // Localize data models. TODO: Unsure if still needed.
  // for (const model of Object.values(artichron.fields.ArmorRequirementData.TYPES)) {
  //   Localization.localizeDataModel(model);
  //   const meta = model.metadata;
  //   model.metadata = foundry.utils.mergeObject(meta, {
  //     label: game.i18n.localize(meta.label),
  //     hint: game.i18n.localize(meta.hint),
  //   }, { inplace: false });
  // }

  // for (const model of Object.values(artichron.fields.ProgressionData.TYPES)) {
  //   Localization.localizeDataModel(model);
  // }

  // Localize party actor clocks schema.
  // const clocks = CONFIG.Actor.dataModels.party.schema.getField("clocks").constructor.TYPES;
  // for (const cls of Object.values(clocks)) Localization.localizeDataModel(cls);

  // Localize activities.
  // for (const model of Object.values(artichron.activities)) Localization.localizeDataModel(model);

  // Localize formula models.
  // Localization.localizeDataModel(artichron.fields.FormulaModel);
  // Localization.localizeDataModel(artichron.fields.DamageFormulaModel);

  // Explicitly localize this embedded data model due to unknown reasons.
  // for (const v of Object.values(CONFIG.Item.dataModels)) {
  //   const schema = v.schema.getField("attributes.levels");
  //   if (schema) Localization.localizeDataModel({ schema: schema });
  // }
});

/* -------------------------------------------------- */
/*   Ready hook                                       */
/* -------------------------------------------------- */

Hooks.once("ready", function() {
  Hooks.on("hotbarDrop", function(bar, data, slot) {
    if (data.type === "ActiveEffect") {
      createEffectMacro(data, slot);
      return false;
    }

    if (data.type === "Item") {
      createItemMacro(data, slot);
      return false;
    }
  });

  setupCarousel();
});

/* -------------------------------------------------- */
/*   Sidebar diretories                               */
/* -------------------------------------------------- */

Hooks.on("getEntryContextActorDirectory", (directory, options) => {
  options.push({
    name: "ARTICHRON.ContextMenu.Directory.AssignPrimaryParty",
    icon: "<i class='fa-solid fa-fw fa-medal'></i>",
    condition: (li) => {
      const actor = game.actors.get(li.dataset.entryId);
      const current = game.settings.get("artichron", "primaryParty")?.actor;
      return game.user.isGM && (actor.type === "party") && (actor !== current);
    },
    callback: (li) => game.settings.set("artichron", "primaryParty", { actor: game.actors.get(li.dataset.entryId) }),
    group: "system",
  }, {
    name: "ARTICHRON.ContextMenu.Directory.RemovePrimaryParty",
    icon: "<i class='fa-solid fa-fw fa-times'></i>",
    condition: (li) => {
      const actor = game.actors.get(li.dataset.entryId);
      const current = game.settings.get("artichron", "primaryParty")?.actor;
      return game.user.isGM && (actor === current);
    },
    callback: (li) => game.settings.set("artichron", "primaryParty", { actor: null }),
    group: "system",
  });
});

Hooks.on("renderActorDirectory", (directory, html) => {
  const current = game.settings.get("artichron", "primaryParty")?.actor?.id;
  if (!current) return;
  const entry = html.querySelector(`[data-entry-id="${current}"]`);
  if (entry) entry.classList.add("primary-party");
});

/* -------------------------------------------------- */

/**
 * Create a new carousel combat tracker and render it.
 */
async function setupCarousel() {
  const cls = applications.CombatCarousel;
  const app = new cls();
  app.render({ force: true });
}

/* -------------------------------------------------- */
/*   Hotbar macros                                    */
/* -------------------------------------------------- */

/**
 * Create a Macro from an ActiveEffect drop.
 * Get an existing macro if one exists, otherwise create a new one.
 * @param {object} data     The dropped data.
 * @param {number} slot     The hotbar slot to use.
 */
async function createEffectMacro(data, slot) {
  const effect = await ActiveEffect.implementation.fromDropData(data);
  const command = `artichron.utils.macro.toggleEffect("${effect.name}");`;
  const name = game.i18n.format("ARTICHRON.MACRO.ToggleEffect", { name: effect.name });
  let macro = game.macros.find(m => (m.name === name) && (m.command === command));
  if (!macro) {
    macro = await Macro.implementation.create({
      name: name,
      type: "script",
      img: effect.img,
      command: command,
    });
  }
  game.user.assignHotbarMacro(macro, slot);
}

/* -------------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing macro if one exists, otherwise create a new one.
 * @param {object} data     The dropped data.
 * @param {number} slot     The hotbar slot to use.
 */
async function createItemMacro(data, slot) {
  const item = await Item.implementation.fromDropData(data);
  const command = `artichron.utils.macro.useItem("${item.name}", event);`;
  const name = game.i18n.format("ARTICHRON.MACRO.UseItem", { name: item.name });
  let macro = game.macros.find(m => (m.name === name) && (m.command === command));
  if (!macro) {
    macro = await Macro.implementation.create({
      name: name,
      type: "script",
      img: item.img,
      command: command,
    });
  }
  game.user.assignHotbarMacro(macro, slot);
}

/* -------------------------------------------------- */
/*   Handlebars helpers                               */
/* -------------------------------------------------- */

function inventoryItem(item, options) {
  const element = elements.InventoryItemElement.create({ ...options.hash, item });
  return new Handlebars.SafeString(element.outerHTML);
}

function effectEntry(effect, options) {
  const element = elements.EffectEntryElement.create({ ...options.hash, effect });
  return new Handlebars.SafeString(element.outerHTML);
}

function thresholdBar(options) {
  const element = elements.ThresholdBarElement.create(options.hash);
  return new Handlebars.SafeString(element.outerHTML);
}

function batteryProgress(field, options) {
  let { min, max, name, value, step, ...inputConfig } = options.hash;
  min ??= field.min;
  max ??= field.max;
  name ??= field.fieldPath;
  value ??= field.initial;
  step ??= 1;
  const element = elements.BatteryProgressElement.create({ ...inputConfig, min, max, value, step, name });
  return new Handlebars.SafeString(element.outerHTML);
}

function progressClock(options) {
  const element = elements.ProgressClockElement.create(options.hash);
  return new Handlebars.SafeString(element.outerHTML);
}
