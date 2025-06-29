import * as applications from "./module/applications/_module.mjs";
import * as canvas from "./module/canvas/_module.mjs";
import * as data from "./module/data/_module.mjs";
import * as dice from "./module/dice/_module.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as helpers from "./module/helpers/_module.mjs";
import * as migrations from "./module/helpers/migrations.mjs";
import * as SYSTEM from "./module/helpers/config.mjs";
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
  utils,
};

/* -------------------------------------------------- */
/*   Init hook                                        */
/* -------------------------------------------------- */

Hooks.once("init", function() {
  registerSettings();
  registerEnrichers();
  registerFonts();
  helpers.sockets.registerSockets();
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

  // ActiveEffect Data Models
  Object.assign(CONFIG.ActiveEffect.dataModels, {
    buff: data.effects.BuffData,
    condition: data.effects.ConditionData,
    enhancement: data.effects.EnhancementData,
    fusion: data.effects.FusionData,
  });

  // Actor Data Models
  Object.assign(CONFIG.Actor.dataModels, {
    hero: data.actors.HeroData,
    merchant: data.actors.MerchantData,
    monster: data.actors.MonsterData,
    party: data.actors.PartyData,
  });

  // ChatMessage Data Models
  Object.assign(CONFIG.ChatMessage.dataModels, {
    damage: data.chatMessages.DamageData,
    effect: data.chatMessages.EffectData,
    healing: data.chatMessages.HealingData,
    teleport: data.chatMessages.TeleportData,
    trade: data.chatMessages.TradeMessageData,
  });

  // Combatant Data Models
  Object.assign(CONFIG.Combatant.dataModels, {
    artichron: data.combatants.CombatantSystemModel,
  });

  // Item Data Models
  Object.assign(CONFIG.Item.dataModels, {
    ammo: data.items.AmmoData,
    armor: data.items.ArmorData,
    elixir: data.items.ElixirData,
    part: data.items.PartData,
    path: data.items.PathData,
    spell: data.items.SpellData,
    talent: data.items.TalentData,
  });

  // RegionBehavior Data Models
  Object.assign(CONFIG.RegionBehavior.dataModels, {
    enterStore: data.regionBehaviors.EnterStoreBehaviorData,
    statusCondition: data.regionBehaviors.ToggleConditionBehaviorData,
    doorState: data.regionBehaviors.DoorStateConditionBehaviorData,
  });

  // Hook up roll types.
  CONFIG.Dice.rolls[0] = dice.rolls.RollArtichron;
  CONFIG.Dice.rolls.push(dice.rolls.DamageRoll);
  Object.assign(CONFIG.Dice, dice.rolls);

  // Register sheet application classes
  const { DocumentSheetConfig } = foundry.applications.apps;
  const configureSheet = (documentName, SheetClass, options = {}) => {
    return DocumentSheetConfig.registerSheet(foundry.documents[documentName], "artichron", SheetClass, {
      makeDefault: true,
      ...options,
    });
  };

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

  configureSheet("Item", applications.sheets.item.AmmoSheet, {
    label: "ARTICHRON.SHEET.ITEM.AmmoSheet",
    types: ["ammo"],
  });
  configureSheet("Item", applications.sheets.item.ArmorSheet, {
    label: "ARTICHRON.SHEET.ITEM.ArmorSheet",
    types: ["armor"],
  });
  configureSheet("Item", applications.sheets.item.ElixirSheet, {
    label: "ARTICHRON.SHEET.ITEM.ElixirSheet",
    types: ["elixir"],
  });
  configureSheet("Item", applications.sheets.item.PathSheet, {
    label: "ARTICHRON.SHEET.ITEM.PathSheet",
    types: ["path"],
  });
  configureSheet("Item", applications.sheets.item.PartSheet, {
    label: "ARTICHRON.SHEET.ITEM.PartSheet",
    types: ["part"],
  });
  configureSheet("Item", applications.sheets.item.SpellSheet, {
    label: "ARTICHRON.SHEET.ITEM.SpellSheet",
    types: ["spell"],
  });
  configureSheet("Item", applications.sheets.item.TalentSheet, {
    label: "ARTICHRON.SHEET.ITEM.TalentSheet",
    types: ["talent"],
  });

  // Set up conditions.
  CONFIG.statusEffects = Object.entries(SYSTEM.STATUS_CONDITIONS).map(([id, config]) => {
    return { ...config, id, _id: utils.staticId(id) };
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
    "document-list-entries": documentListEntries,
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

  const localizeTypes = types => {
    for (const v of Object.values(types))
      foundry.helpers.Localization.localizeDataModel(v);
  };

  localizeTypes(data.pseudoDocuments.activities);
  localizeTypes(data.pseudoDocuments.advancements);
  localizeTypes(data.pseudoDocuments.armorRequirements);
  localizeTypes(data.pseudoDocuments.clocks);
  localizeTypes(data.pseudoDocuments.damage);
  localizeTypes(data.pseudoDocuments.traitChoices);
});

/* -------------------------------------------------- */
/*   Utilities                                        */
/* -------------------------------------------------- */

Hooks.on("hotReload", helpers.hotReload);

/* -------------------------------------------------- */
/*   Fonts                                            */
/* -------------------------------------------------- */

/**
 * Assign font families.
 */
function registerFonts() {
  Object.assign(CONFIG.fontDefinitions, {
    Raleway: {
      editor: true,
      fonts: [
        { urls: ["systems/artichron/assets/fonts/Raleway/Raleway-VariableFont_wght.ttf"] },
      ],
    },
  });
}

/* -------------------------------------------------- */
/*   Hotbar macros                                    */
/* -------------------------------------------------- */

Hooks.on("hotbarDrop", function(bar, data, slot) {
  if (data.type === "ActiveEffect") {
    createEffectMacro(data, slot);
    return false;
  }

  if (data.type === "Item") {
    if (!fromUuidSync(data.uuid)?.isEmbedded) return;
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
  const command = `artichron.helpers.macros.toggleEffect("${effect.name}");`;
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
  const command = `artichron.helpers.macros.useItem("${item.name}", event);`;
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

function documentListEntries(options) {
  const element = artichron.applications.elements.DocumentListEntriesElement.create(options.hash);
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
