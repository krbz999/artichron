/** @import {HotReloadData} from "@client/types.mjs" */

/**
 * Fix to allow importing in css.
 * @param {HotReloadData} data   Hot reload data.
 */
export default function hotReload(data) {
  if (data.packageType !== "system") return;
  if (!data.path.startsWith("systems/artichron/styles/")) return;

  // Taken from core's `Game##hotReloadCSS`
  const pathRegex = new RegExp("@import \"systems/artichron/styles.css(?:\\?[^\"]+)?\"");
  for (const style of document.querySelectorAll("style")) {
    const [match] = style.textContent.match(pathRegex) ?? [];
    if (match) {
      style.textContent = style.textContent.replace(match, `@import "systems/artichron/styles.css?${Date.now()}"`);
      return;
    }
  }
}
