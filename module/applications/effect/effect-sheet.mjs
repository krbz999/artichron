export default class EffectSheetArtichron extends ActiveEffectConfig {
  async _renderInner(...args) {
    const jq = await super._renderInner(...args);
    const html = jq[0];
    if (this.document.type !== "fusion") return jq;
    const choices = Array.from(this.document.system.BONUS_FIELDS).reduce((acc, k) => {
      acc[k] = k;
      return acc;
    }, {});
    html.querySelectorAll("[name^='changes.'][name$='.key']").forEach(n => {
      const div = document.createElement("DIV");
      div.innerHTML = `<select name="${n.name}">` + HandlebarsHelpers.selectOptions(choices, {hash: {
        selected: n.value, blank: "", sort: true
      }}) + "</select>";
      n.replaceWith(div.firstElementChild);
    });
    return jq;
  }
}
