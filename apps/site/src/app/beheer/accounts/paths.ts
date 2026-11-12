export const accountsPath = '/beheer/accounts'

export const newAccountPath = `${accountsPath}/nieuw`

/** The address of the form of an account, with what the last action left to say (`gedaan`). */
export function accountPath(id: number, done?: string) {
  return done === undefined ? `${accountsPath}/${id}` : `${accountsPath}/${id}?gedaan=${done}`
}
