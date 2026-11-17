const legend = /<span class="hf-table-legend[^"]*">((?:<span class="hf-table-legend-item">[\s\S]*?<\/span>)+)<\/span>/gu
const item = /<span class="hf-table-legend-item">([\s\S]*?)<\/span>/gu

/**
 * The legends under the tables in some HTML, each as the words of its columns in order, such
 * as `gespeeld, winst, gelijk`. The icons are left out and the words are joined with a comma
 * so a test can say what a legend holds; on the page the items stand apart with room, and
 * there are no commas.
 */
export const legendsOf = (html: string) =>
  [...html.replaceAll('<!-- -->', '').matchAll(legend)].map((match) =>
    [...(match[1] ?? '').matchAll(item)]
      .map((words) => (words[1] ?? '').replace(/<svg[\s\S]*?<\/svg>/u, '').trim())
      .join(', '),
  )
