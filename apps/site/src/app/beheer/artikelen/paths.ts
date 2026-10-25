export const articlesPath = '/beheer/artikelen'

/** The address of the form of an article, with what the last action left to say (`gedaan`). */
export function articlePath(id: number, done?: string) {
  return done === undefined ? `${articlesPath}/${id}` : `${articlesPath}/${id}?gedaan=${done}`
}

/** The address of the preview of an article. */
export const previewPath = (id: number) => `${articlesPath}/${id}/voorbeeld`
