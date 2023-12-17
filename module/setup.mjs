import {SYSTEM} from "./helpers/config.mjs";
import * as applications from "./applications/_module.mjs";
import {preloadHandlebarsTemplates} from "./helpers/templates.mjs";
import {dice} from "./dice/_module.mjs";
import {dataModels, documents} from "./documents/_module.mjs";
import {ChatLog} from "./documents/chat/chat-log.mjs";
import * as utils from "./helpers/utils.mjs";

/* -------------------------------------------- */
/*  Define Module Structure                     */
/* -------------------------------------------- */

globalThis.artichron = {
  applications: applications,
  config: SYSTEM,
  dataModels: dataModels,
  dice: dice,
  documents: documents,
  migrations: {},
  utils: utils
};

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", function() {
  globalThis.artichron = game.artichron = Object.assign(game.system, globalThis.artichron);
  CONFIG.Canvas.dispositionColors.CONTROLLED = 2502655;
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Record Configuration Values
  CONFIG.SYSTEM = SYSTEM;
  CONFIG.Actor.documentClass = documents.actor;
  CONFIG.Item.documentClass = documents.item;
  CONFIG.Combat.documentClass = documents.combat;
  CONFIG.Token.documentClass = documents.tokenDocument;
  CONFIG.Token.objectClass = documents.token;

  // Hook up system data types
  CONFIG.Actor.dataModels = dataModels.actor;
  CONFIG.Item.dataModels = dataModels.item;

  // Hook up dice types.
  CONFIG.Dice.rolls.push(...Object.values(dice));
  CONFIG.Dice.DamageRoll = dice.DamageRoll;
  CONFIG.Dice.DamageRollCombined = dice.DamageRollCombined;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d10",
    decimals: 2
  };

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  //Actors.registerSheet("artichron", applications.ActorSheetBoss, {types: ["boss"], makeDefault: true, label: "ARTICHRON.ActorSheetBoss"});
  //Actors.registerSheet("artichron", applications.ActorSheetMonster, {types: ["monster"], makeDefault: true, label: "ARTICHRON.ActorSheetMonster"});
  Actors.registerSheet("artichron", applications.ActorSheetHero, {types: ["hero"], makeDefault: true, label: "ARTICHRON.ActorSheetHero"});
  //Actors.registerSheet("artichron", applications.ActorSheetMerchant, {types: ["merchant"], makeDefault: true, label: "ARTICHRON.ActorSheetMerchant"});

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("artichron", applications.ItemSheetArsenal, {types: ["arsenal"], makeDefault: true, label: "ARTICHRON.ItemSheetArsenal"});
  Items.registerSheet("artichron", applications.ItemSheetArmor, {types: ["armor"], makeDefaut: true, label: "ARTICHRON.ItemSheetArmor"});
  Items.registerSheet("artichron", applications.ItemSheetElixir, {types: ["elixir"], makeDefaut: true, label: "ARTICHRON.ItemSheetElixir"});

  // Preload Handlebars templates.
  preloadHandlebarsTemplates();
  ChatLog.init();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", function() {
  Hooks.on("hotbarDrop", function(bar, data, slot) {
    if (data.type === "ActiveEffect") {
      createEffectMacro(bar, data, slot);
      return false;
    }
  });
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

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
      img: effect.icon,
      command: command
    });
  }
  return game.user.assignHotbarMacro(macro, slot);
}
