import { Text } from '@fansite/design-system'

/** Plain text of the editors as paragraphs: every line with text is one. */
export function Paragraphs({ text }: { text: string }) {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line, index) => <Text key={index}>{line}</Text>)
}
