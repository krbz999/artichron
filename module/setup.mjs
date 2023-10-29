import {SYSTEM} from "./helpers/config.mjs";
import * as applications from "./applications/_module.mjs";
import {preloadHandlebarsTemplates} from "./helpers/templates.mjs";
import {dice} from "./dice/_module.mjs";
import {dataModels, documents} from "./documents/_module.mjs";
import {registerHandlebarHelpers} from "./helpers/handlebarHelpers.mjs";
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

  // Preload Handlebars templates.
  preloadHandlebarsTemplates();
  registerHandlebarHelpers();
  ChatLog.init();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  //Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn("You can only create macro buttons for owned Items");
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.boilerplate.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: {"boilerplate.itemMacro": true}
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then(item => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
    }

    // Trigger the item roll
    item.roll();
  });
}
