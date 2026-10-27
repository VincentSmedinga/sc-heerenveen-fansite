import { Bold } from '@tiptap/extension-bold'
import { BulletList } from '@tiptap/extension-bullet-list'
import { Document } from '@tiptap/extension-document'
import { Heading } from '@tiptap/extension-heading'
import { Italic } from '@tiptap/extension-italic'
import { Link } from '@tiptap/extension-link'
import { ListItem } from '@tiptap/extension-list-item'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { UndoRedo } from '@tiptap/extensions'

import { isLinkAddress } from './linkAddress'

/**
 * Everything the editor knows, and nothing else: whatever is not here, such as an image, a
 * table or a heading of another level, is dropped when it is pasted or dropped in, and only
 * its text stays. A list item holds one paragraph, so there are no lists inside lists.
 */
export const extensions = [
  Document,
  Paragraph,
  Text,
  Heading.configure({ levels: [2] }),
  BulletList,
  ListItem.extend({
    // The standard Tab and Shift+Tab move an item in and out of a list. That would keep the
    // keys from leaving the editor.
    addKeyboardShortcuts() {
      return { Enter: () => this.editor.commands.splitListItem(this.name) }
    },
    content: 'paragraph',
  }),
  Bold,
  Italic,
  // A link keeps its address and nothing else, so the JSON stays small. It never makes a link
  // by itself, and an address that is not allowed gives no link at all, also in pasted text.
  Link.configure({
    autolink: false,
    HTMLAttributes: {},
    isAllowedUri: (address) => isLinkAddress(address),
    linkOnPaste: false,
    openOnClick: false,
  }).extend({
    addAttributes() {
      return { href: { default: null } }
    },
  }),
  UndoRedo,
]
