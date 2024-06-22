import {SYSTEM} from "./module/helpers/config.mjs";
import * as applications from "./module/applications/_module.mjs";
import {dice} from "./module/dice/_module.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as utils from "./module/helpers/utils.mjs";
import auraInit from "./module/documents/canvas/canvas.mjs";
import {registerSettings} from "./module/helpers/settings.mjs";
import {registerEnrichers} from "./module/helpers/enrichers.mjs";
import {registerSockets} from "./module/helpers/sockets.mjs";
import {BuffTarget, DamageTarget} from "./module/elements/target-element.mjs";

/* ---------------------------------------- */
/*  Define Module Structure                 */
/* ---------------------------------------- */

globalThis.artichron = {
  applications: applications,
  config: SYSTEM,
  dataModels: documents.dataModels,
  dice: dice,
  documents: documents.documentClasses,
  migrations: {},
  utils: utils,
  templates: documents.templates
};

/* ---------------------------------------- */
/*  Init Hook                               */
/* ---------------------------------------- */

Hooks.once("init", function() {
  registerSettings();
  registerEnrichers();
  registerSockets();
  CONFIG.Canvas.dispositionColors.CONTROLLED = 2502655;
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Record Configuration Values
  CONFIG.SYSTEM = SYSTEM;
  CONFIG.Actor.documentClass = documents.documentClasses.actor;
  CONFIG.Item.documentClass = documents.documentClasses.item;
  CONFIG.Combat.documentClass = documents.documentClasses.combat;
  CONFIG.Combatant.documentClass = documents.documentClasses.combatant;
  CONFIG.Token.documentClass = documents.documentClasses.tokenDocument;
  CONFIG.Token.objectClass = documents.documentClasses.token;
  CONFIG.Token.hudClass = applications.TokenHUDArtichron;
  CONFIG.MeasuredTemplate.objectClass = documents.documentClasses.template;
  CONFIG.MeasuredTemplate.documentClass = documents.documentClasses.templateDocument;
  CONFIG.ChatMessage.documentClass = documents.documentClasses.message;
  CONFIG.ActiveEffect.documentClass = documents.documentClasses.effect;

  // Hook up system data types
  CONFIG.Actor.dataModels = documents.dataModels.actor;
  CONFIG.Item.dataModels = documents.dataModels.item;
  CONFIG.ChatMessage.dataModels = documents.dataModels.message;
  CONFIG.Combatant.dataModels = documents.dataModels.combatant;
  CONFIG.ActiveEffect.dataModels = documents.dataModels.effect;

  // Hook up dice types.
  CONFIG.Dice.rolls[0] = dice.RollArtichron;
  CONFIG.Dice.rolls.push(dice.DamageRoll);
  CONFIG.Dice.Roll = dice.RollArtichron;
  CONFIG.Dice.DamageRoll = dice.DamageRoll;

  /** Set an initiative formula for the system */
  CONFIG.Combat.initiative.formula = "1d12<=(12 - @pips)";
  CONFIG.ui.combat = applications.CombatTrackerArtichron;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("artichron", applications.ActorSheetArtichron, {
    makeDefault: true,
    label: "ARTICHRON.ActorSheet.Base"
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("artichron", applications.ItemSheetArtichron, {
    makeDefault: true,
    label: "ARTICHRON.ItemSheet.Base"
  });

  DocumentSheetConfig.unregisterSheet(ActiveEffect, "core", ActiveEffectConfig);
  DocumentSheetConfig.registerSheet(ActiveEffect, "artichron", applications.ActiveEffectSheetArtichron, {
    makeDefault: true,
    label: "ARTICHRON.ActiveEffectSheet.Base"
  });

  auraInit();

  // Custom elements.
  window.customElements.define("damage-target", DamageTarget);
  window.customElements.define("buff-target", BuffTarget);

  // Set up conditions.
  CONFIG.statusEffects = [];
  for (const [id, config] of Object.entries(SYSTEM.STATUS_CONDITIONS)) {
    CONFIG.statusEffects.push({...config, id: id, _id: utils.staticId(id)});
  }

  CONFIG.specialStatusEffects.DEFEATED = "defeated";
  CONFIG.specialStatusEffects.BURROW = "underground";
  CONFIG.specialStatusEffects.FLY = "flying";
  CONFIG.specialStatusEffects.HOVER = "levitating";
});

/* ---------------------------------------- */
/*  Setup Hook                              */
/* ---------------------------------------- */

Hooks.once("setup", function() {});

/* ---------------------------------------- */
/*  i18nInit Hook                           */
/* ---------------------------------------- */

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
    }
  };

  for (const [k, v] of Object.entries(CONFIG.SYSTEM)) {
    localize(CONFIG.SYSTEM, k, v);
  }
});

/* ---------------------------------------- */
/*  Ready Hook                              */
/* ---------------------------------------- */

Hooks.once("ready", function() {
  Hooks.on("hotbarDrop", function(bar, data, slot) {
    if (data.type === "ActiveEffect") {
      createEffectMacro(bar, data, slot);
      return false;
    }
  });

  setupCarousel();
});

/**
 * Create a new carousel combat tracker and render it.
 */
async function setupCarousel() {
  const cls = applications.CombatCarousel;
  const app = new cls();
  app.render({force: true});
}

/* ---------------------------------------- */
/*  Hotbar Macros                           */
/* ---------------------------------------- */

/**
 * Create a Macro from an ActiveEffect drop.
 * Get an existing macro if one exists, otherwise create a new one.
 * @param {*} bar
 * @param {object} data         The dropped data.
 * @param {number} slot         The hotbar slot to use.
 * @returns {Promise<User>}     A Promise which resolves once the User update is complete.
 */
async function createEffectMacro(bar, data, slot) {
  const effect = await ActiveEffect.implementation.fromDropData(data);
  const command = `artichron.utils.toggleEffect("${effect.name}");`;
  const name = game.i18n.format("ARTICHRON.EffectToggleMacro", {name: effect.name});
  let macro = game.macros.find(m => (m.name === name) && (m.command === command));
  if (!macro) {
    macro = await Macro.implementation.create({
      name: name,
      type: "script",
      img: effect.img,
      command: command
    });
  }
  return game.user.assignHotbarMacro(macro, slot);
}
