export default class Dialog extends foundry.applications.api.Dialog {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["artichron"],
    position: {
      width: 400,
      height: "auto",
    },
  };
}
