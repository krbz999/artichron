import BaseDocumentMixin from "./base-document-mixin.mjs";

/**
 * Base chat message document class.
 * @extends foundry.documents.ChatMessage
 * @mixes BaseDocumentMixin
 */
export default class ChatMessageArtichron extends BaseDocumentMixin(foundry.documents.ChatMessage) {}
