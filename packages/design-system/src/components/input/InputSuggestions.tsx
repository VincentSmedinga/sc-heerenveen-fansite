export type InputSuggestionsProps = {
  /** The `id` that the `list` of one or more Inputs names. */
  id: string
  /** The suggestions, each once. They are in the page, so they work without JavaScript. */
  suggestions: readonly string[]
}

/**
 * The suggestions for an Input, as a `<datalist>`: a keyboard or screen reader user can pick
 * one or write something else. Put it once in the page, and give each Input that offers them
 * `list` with this `id`.
 */
export const InputSuggestions = ({ id, suggestions }: InputSuggestionsProps) => (
  <datalist id={id}>
    {suggestions.map((suggestion) => (
      <option key={suggestion} value={suggestion} />
    ))}
  </datalist>
)
