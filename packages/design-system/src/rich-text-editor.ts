/*
 * The rich text editor, in an entry of its own. Tiptap is a large dependency, and it is only
 * for the pages that have an editor. The main entry (index.ts) does not export it, so a page
 * that does not import this file gets none of Tiptap in its JavaScript.
 */

export { isLinkAddress } from './components/rich-text-editor/linkAddress'
export { RichTextEditor } from './components/rich-text-editor/RichTextEditor'
export type { RichTextEditorProps, RichTextValue } from './components/rich-text-editor/RichTextEditor'
