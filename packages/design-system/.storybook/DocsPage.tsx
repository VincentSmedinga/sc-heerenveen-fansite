import { Description, Stories, Subtitle, Title } from '@storybook/addon-docs/blocks'

/**
 * Docs page for a stories file: title, description and every story, without the controls table.
 */
export const DocsPage = () => (
  <>
    <Title />
    <Subtitle />
    <Description />
    <Stories includePrimary title="Voorbeelden" />
  </>
)
