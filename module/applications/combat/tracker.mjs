export default class CombatTrackerArtichron extends CombatTracker {}

Hooks.on("renderCombatTrackerArtichron", (app, [html]) => {
  const inits = html.querySelectorAll(".token-initiative");
  for (const init of inits) {
    const combatant = init.closest("[data-combatant-id]");
    if (combatant.classList.contains("defeated")) continue;
    const pips = ui.combat.viewed.combatants.get(combatant.dataset.combatantId).system.pips;
    if (!Number.isInteger(pips)) continue;
    const template = `<div class="pips" data-id="${combatant.id}">${pips} Pips</span>`;
    const div = document.createElement("DIV");
    div.innerHTML = template;
    init.after(div.firstElementChild);
  }
});
