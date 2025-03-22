import { registerSockets } from "./module/helpers/sockets.mjs";
import * as SYSTEM from "./module/helpers/config.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as migrations from "./module/helpers/migrations.mjs";
import * as utils from "./module/helpers/utils.mjs";
import * as applications from "./module/applications/_module.mjs";
import * as canvas from "./module/canvas/_module.mjs";
import * as dice from "./module/dice/_module.mjs";
import * as data from "./module/data/_module.mjs";
import registerEnrichers from "./module/helpers/enrichers.mjs";
import registerSettings from "./module/helpers/settings.mjs";

// Custom elements.
for (const element of Object.values(applications.elements)) {
  window.customElements.define(element.tagName, element);
}

/* -------------------------------------------------- */
/*   Define module structure                          */
/* -------------------------------------------------- */

globalThis.artichron = {
  applications,
  canvas,
  config: SYSTEM,
  data,
  dataModels: documents.dataModels,
  dice,
  documents,
  migrations,
  utils,
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
  CONFIG.Token.hudClass = applications.hud.TokenHUD;
  CONFIG.Token.objectClass = canvas.placeables.TokenArtichron;
  CONFIG.Token.rulerClass = canvas.placeables.tokens.TokenRuler;
  CONFIG.ui.chat = applications.sidebar.tabs.ChatLog;
  CONFIG.ui.combat = applications.sidebar.tabs.CombatTracker;
  CONFIG.ui.carousel = applications.apps.combat.CombatCarousel;
  CONFIG.ui.tooltips = applications.ui.Tooltips;
  CONFIG.Canvas.layers.tokens.layerClass = canvas.layers.TokenLayerArtichron;

  // Hook up document classes.
  for (const Cls of Object.values(documents)) {
    CONFIG[Cls.documentName].documentClass = Cls;
  }

  // Hook up system data types.
  for (const [documentName, models] of [
    ["Actor", data.actors],
    ["ChatMessage", data.chatMessages],
    ["Combatant", data.combatants],
    ["ActiveEffect", data.effects],
    ["Item", data.items],
    ["RegionBehavior", data.regionBehaviors],
  ]) {
    for (const v of Object.values(models)) {
      if (foundry.utils.isSubclass(v, foundry.abstract.TypeDataModel)) {
        const { type, icon } = v.metadata;
        Object.assign(CONFIG[documentName].dataModels, { [type]: v });
        Object.assign(CONFIG[documentName].typeIcons, { [type]: icon });
      }
    }
  }

  // Hook up dice types.
  CONFIG.Dice.rolls[0] = dice.RollArtichron;
  CONFIG.Dice.rolls.push(dice.DamageRoll);
  Object.assign(CONFIG.Dice, dice);

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
      { DocumentClass: foundry.documents.Actor, SheetClass: foundry.appv1.sheets.ActorSheet },
      { DocumentClass: foundry.documents.Item, SheetClass: foundry.appv1.sheets.ItemSheet },
      { DocumentClass: foundry.documents.ActiveEffect, SheetClass: foundry.applications.sheets.ActiveEffectConfig },
    ],
    artichron: [
      {
        DocumentClass: foundry.documents.Actor,
        SheetClass: applications.sheets.actor.ActorSheetHero,
        options: { makeDefault: true, label: "ARTICHRON.SHEET.ACTOR.Hero", types: ["hero"] },
      },
      {
        DocumentClass: foundry.documents.Actor,
        SheetClass: applications.sheets.actor.ActorSheetMonster,
        options: { makeDefault: true, label: "ARTICHRON.SHEET.ACTOR.Monster", types: ["monster"] },
      },
      {
        DocumentClass: foundry.documents.Actor,
        SheetClass: applications.sheets.actor.ActorSheetMerchant,
        options: { makeDefault: true, label: "ARTICHRON.SHEET.ACTOR.Merchant", types: ["merchant"] },
      },
      {
        DocumentClass: foundry.documents.Actor,
        SheetClass: applications.sheets.actor.ActorSheetParty,
        options: { makeDefault: true, label: "ARTICHRON.SHEET.ACTOR.Party", types: ["party"] },
      },
      {
        DocumentClass: foundry.documents.Item,
        SheetClass: applications.sheets.item.ItemSheet,
        options: {
          makeDefault: true,
          label: "ARTICHRON.SHEET.ITEM.Base",
          types: ["ammo", "armor", "elixir", "part", "shield", "spell", "weapon"],
        },
      },
      {
        DocumentClass: foundry.documents.ActiveEffect,
        SheetClass: applications.sheets.effect.ActiveEffectSheet,
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
  applications.ui.Tooltips.activateListeners();
});

/* -------------------------------------------------- */

Hooks.once("ready", () => {
  ui.tooltips.observe();
});

/* -------------------------------------------------- */
/*   i18nInit hook                                    */
/* -------------------------------------------------- */

Hooks.once("i18nInit", function() {
  const { Localization } = foundry.helpers;

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

  for (const [k, v] of Object.entries(artichron.config)) {
    localize(artichron.config, k, v);
  }

  // Localize data models.
  const { armorRequirements, clocks, activities } = artichron.data.pseudoDocuments;
  for (const model of Object.values(armorRequirements.BaseArmorRequirement.TYPES)) Localization.localizeDataModel(model);
  for (const model of Object.values(clocks.BaseClock.TYPES)) Localization.localizeDataModel(model);
  for (const model of Object.values(activities.BaseActivity.TYPES)) Localization.localizeDataModel(model);

  // Localize damage formula models.
  Localization.localizeDataModel(artichron.data.DamageFormulaModel);
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
});

/* -------------------------------------------------- */
/*   Sidebar directories                              */
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
/*   Hotbar macros                                    */
/* -------------------------------------------------- */

/**
 * Create a Macro from an ActiveEffect drop.
 * Get an existing macro if one exists, otherwise create a new one.
 * @param {object} data     The dropped data.
 * @param {number} slot     The hotbar slot to use.
 */
async function createEffectMacro(data, slot) {
  const effect = await foundry.utils.getDocumentClass("ActiveEffect").fromDropData(data);
  const command = `artichron.utils.macro.toggleEffect("${effect.name}");`;
  const name = game.i18n.format("ARTICHRON.MACRO.ToggleEffect", { name: effect.name });
  let macro = game.macros.find(m => (m.name === name) && (m.command === command));
  if (!macro) {
    macro = await foundry.utils.getDocumentClass("Macro").create({
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
  const item = await foundry.utils.getDocumentClass("Item").fromDropData(data);
  const command = `artichron.utils.macro.useItem("${item.name}", event);`;
  const name = game.i18n.format("ARTICHRON.MACRO.UseItem", { name: item.name });
  let macro = game.macros.find(m => (m.name === name) && (m.command === command));
  if (!macro) {
    macro = await foundry.utils.getDocumentClass("Macro").create({
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
  const element = artichron.applications.elements.InventoryItemElement.create({ ...options.hash, item });
  return new Handlebars.SafeString(element.outerHTML);
}

function effectEntry(effect, options) {
  const element = artichron.applications.elements.EffectEntryElement.create({ ...options.hash, effect });
  return new Handlebars.SafeString(element.outerHTML);
}

function thresholdBar(options) {
  const element = artichron.applications.elements.ThresholdBarElement.create(options.hash);
  return new Handlebars.SafeString(element.outerHTML);
}

function batteryProgress(field, options) {
  let { min, max, name, value, step, ...inputConfig } = options.hash;
  min ??= field.min;
  max ??= field.max;
  name ??= field.fieldPath;
  value ??= field.initial;
  step ??= 1;
  const element = artichron.applications.elements.BatteryProgressElement.create({
    ...inputConfig, min, max, value, step, name,
  });
  return new Handlebars.SafeString(element.outerHTML);
}

function progressClock(options) {
  const element = artichron.applications.elements.ProgressClockElement.create(options.hash);
  return new Handlebars.SafeString(element.outerHTML);
}
