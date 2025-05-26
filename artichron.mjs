import { registerSockets } from "./module/helpers/sockets.mjs";
import * as applications from "./module/applications/_module.mjs";
import * as canvas from "./module/canvas/_module.mjs";
import * as data from "./module/data/_module.mjs";
import * as dice from "./module/dice/_module.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as helpers from "./module/helpers/_module.mjs";
import * as migrations from "./module/helpers/migrations.mjs";
import * as SYSTEM from "./module/helpers/config.mjs";
import * as __utils from "./module/helpers/utils.mjs";
import * as utils from "./module/utils/_module.mjs";
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
  dice,
  documents,
  helpers,
  migrations,
  utils: { ...utils, ...__utils }, // FIXME: move helpers.utils into separate files in /utils
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
  CONFIG.ui.actors = applications.sidebar.tabs.ActorDirectory;
  CONFIG.ui.combat = applications.sidebar.tabs.CombatTracker;
  CONFIG.ui.carousel = applications.apps.combat.CombatCarousel;
  CONFIG.ux.TooltipManager = helpers.interaction.TooltipManagerArtichron;
  CONFIG.ux.ContextMenu = applications.ux.ContextMenu;
  CONFIG.Canvas.layers.tokens.layerClass = canvas.layers.TokenLayerArtichron;

  // Hook up document classes and collections.
  CONFIG.ActiveEffect.documentClass = documents.ActiveEffectArtichron;
  CONFIG.Actor.documentClass = documents.ActorArtichron;
  CONFIG.Actor.collection = documents.collections.ActorsArtichron;
  CONFIG.ChatMessage.documentClass = documents.ChatMessageArtichron;
  CONFIG.Combat.documentClass = documents.CombatArtichron;
  CONFIG.Combatant.documentClass = documents.CombatantArtichron;
  CONFIG.Item.documentClass = documents.ItemArtichron;
  CONFIG.Token.documentClass = documents.TokenDocumentArtichron;

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
  const { DocumentSheetConfig } = foundry.applications.apps;
  const configureSheet = (documentName, SheetClass, { register = true, ...options } = {}) => {
    if (register) {
      return DocumentSheetConfig.registerSheet(foundry.documents[documentName], "artichron", SheetClass, {
        makeDefault: true,
        ...options,
      });
    } else {
      return DocumentSheetConfig.unregisterSheet(foundry.documents[documentName], "core", SheetClass);
    }
  };

  configureSheet("Actor", foundry.appv1.sheets.ActorSheet, { register: false });
  configureSheet("Item", foundry.appv1.sheets.ItemSheet, { register: false });
  // configureSheet("ActiveEffect", foundry.applications.sheets.ActiveEffectConfig, { register: false });
  configureSheet("Actor", applications.sheets.actor.ActorSheetHero, {
    label: "ARTICHRON.SHEET.ACTOR.Hero", types: ["hero"],
  });
  configureSheet("Actor", applications.sheets.actor.ActorSheetMonster, {
    label: "ARTICHRON.SHEET.ACTOR.Monster", types: ["monster"],
  });
  configureSheet("Actor", applications.sheets.actor.ActorSheetMerchant, {
    label: "ARTICHRON.SHEET.ACTOR.Merchant", types: ["merchant"],
  });
  configureSheet("Actor", applications.sheets.actor.ActorSheetParty, {
    label: "ARTICHRON.SHEET.ACTOR.Party", types: ["party"],
  });
  configureSheet("Item", applications.sheets.item.ItemSheet, {
    label: "ARTICHRON.SHEET.ITEM.Base",
  });
  // configureSheet("ActiveEffect", applications.sheets.effect.ActiveEffectSheet, {
  //   label: "ARTICHRON.SHEET.EFFECT.Base",
  // });

  // Set up conditions.
  CONFIG.statusEffects = Object.entries(SYSTEM.STATUS_CONDITIONS).map(([id, config]) => {
    return { ...config, id, _id: __utils.staticId(id) };
  });

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
});

/* -------------------------------------------------- */
/*   Ready hook                                       */
/* -------------------------------------------------- */

Hooks.once("ready", () => {
  game.tooltip.observe();
});

/* -------------------------------------------------- */
/*   i18nInit hook                                    */
/* -------------------------------------------------- */

Hooks.once("i18nInit", function() {
  // Localize all strings in the global system configuration object.
  const localize = (o, k, v) => {
    switch (foundry.utils.getType(v)) {
      case "string":
        if (v.startsWith("ARTICHRON")) {
          o[k] = game.i18n.localize(v);
        }
        break;
      case "Object":
        for (const [x, y] of Object.entries(v)) {
          localize(v, x, y);
        }
        break;
      case "Array":
        for (const k of v) {
          if (foundry.utils.getType(k) === "Object") {
            for (const [u, w] of Object.entries(k)) {
              localize(k, u, w);
            }
          }
        }
        break;
    }
  };

  for (const [k, v] of Object.entries(artichron.config)) {
    localize(artichron.config, k, v);
  }

  // FIXME: shouldnt be needed?
  foundry.helpers.Localization.localizeDataModel(data.pseudoDocuments.damage.Damage);
});

/* -------------------------------------------------- */
/*   Utilities                                        */
/* -------------------------------------------------- */

Hooks.on("hotReload", helpers.hotReload);

/* -------------------------------------------------- */
/*   Hotbar macros                                    */
/* -------------------------------------------------- */

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
