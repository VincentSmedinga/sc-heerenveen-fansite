import source from './ExamplePage.tsx?raw'

/*
 * Source for the stories built on the example page. Those stories render a helper such as
 * ExampleHeader, so the generated source would only say <ExampleHeader />. This shows the file
 * that builds the example instead.
 */
export const exampleSource = { code: source, language: 'tsx', type: 'code' } as const
