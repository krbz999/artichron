export default class MeasuredTemplateDocumentArtichron extends MeasuredTemplateDocument {
  async waitForShape() {
    let wait = 0;
    const inter = 10;
    const max = 1000;
    do {
      await new Promise(r => setTimeout(r, inter));
      wait += inter;
    } while (!this.object?.shape && (wait < max));
    return this.object?.shape;
  }
}
