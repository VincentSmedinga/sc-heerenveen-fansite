import '../src/index.css'
import '../src/docs/docs.css'

import addonA11y from '@storybook/addon-a11y'
import addonDocs from '@storybook/addon-docs'
import { definePreview } from '@storybook/react-vite'
import addonPseudoStates from 'storybook-addon-pseudo-states'
import { MINIMAL_VIEWPORTS } from 'storybook/viewport'

import { DocsPage } from './DocsPage'
import { ThemedDocsContainer } from './ThemedDocsContainer'
import { withTheme } from './withTheme'

// Every page in Storybook is Dutch.
document.documentElement.lang = 'nl'

export default definePreview({
  addons: [addonDocs(), addonA11y(), addonPseudoStates()],
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Kleurthema',
      toolbar: {
        dynamicTitle: true,
        icon: 'contrast',
        items: [
          { icon: 'browser', title: 'Volgens systeem', value: 'system' },
          { icon: 'sun', title: 'Licht', value: 'light' },
          { icon: 'moon', title: 'Donker', value: 'dark' },
        ],
        title: 'Thema',
      },
    },
  },
  initialGlobals: {
    theme: 'system',
  },
  parameters: {
    a11y: {
      // Fail the story when axe finds a violation, once tests run (see #24).
      test: 'error',
    },
    backgrounds: {
      // The theme sets the background; Storybook's own backgrounds would hide it.
      disable: true,
    },
    docs: {
      container: ThemedDocsContainer,
      page: DocsPage,
      source: {
        // Show the JSX the story renders, not the `meta.story({ ... })` call around it, so one
        // `render` can serve the light and the dark story. The theme wrapper is a decorator and
        // doesn't belong in the example.
        excludeDecorators: true,
        type: 'dynamic',
      },
    },
    options: {
      // Only Card has controls so far, and the accessibility check is what every story needs;
      // show that panel first.
      selectedPanel: 'storybook/a11y/panel',
      storySort: {
        order: [
          'Huisstijl',
          'Tokens',
          ['Kleur', 'Typografie'],
          'Redactie',
          'HTML-elementen',
          ['Koppen', 'Tekst', 'Links', 'Lijsten', 'Citaat', 'Scheidingslijn', 'Figuur', 'Tabel', 'Code', 'Formulier'],
          'Componenten',
          [
            'Overzicht',
            'Root',
            'Body',
            'Page',
            'Page.Header',
            'Page.Body',
            'Page.Main',
            'Page.Sidebar',
            'Page.Cell',
            'Page.Footer',
            'Card',
            'Form',
            'Field',
            'Input',
            'Textarea',
            'Select',
            'Button',
            'ErrorSummary',
            'Honeypot',
            'Navigation',
            'Heading',
            'Text',
            'Link',
            'List',
            'NewsItem',
            'DiscussionItem',
            'Logo',
          ],
          'Hulpklassen',
          'Patronen',
        ],
      },
    },
    viewport: {
      // The standard screens, one between the width where the columns sit side by side and the
      // full width of the page column, to see them shrink, and one wider than the page column,
      // to see what is outside it. A small tablet, 720px, is in the range where a footer with
      // many links first has to give way.
      options: {
        ...MINIMAL_VIEWPORTS,
        medium: { name: 'Klein tablet', styles: { height: '800px', width: '720px' }, type: 'tablet' },
        middle: { name: 'Middelgroot scherm', styles: { height: '800px', width: '976px' }, type: 'desktop' },
        wide: { name: 'Breed scherm', styles: { height: '1080px', width: '1920px' }, type: 'desktop' },
      },
    },
  },
})
