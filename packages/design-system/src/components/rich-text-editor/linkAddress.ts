/**
 * Whether an address may be the target of a link in an article: one on another site that starts
 * with `https://`, or a page of ours that starts with a single slash. Anything else, such as
 * `http://`, `javascript:`, `//evil.example` or `/\evil.example`, is not.
 */
export const isLinkAddress = (address: string) =>
  /^https:\/\/[^\s/\\]\S*$/.test(address) || /^\/(?![/\\])\S*$/.test(address)

/** What is wrong with an address for a link, and how to fix it; nothing when it is fine. */
export const linkAddressError = (address: string) => {
  if (address === '') {
    return 'Vul het adres van de link in. Een link begint met https:// of met een schuine streep, zoals /bronnen.'
  }

  return isLinkAddress(address)
    ? undefined
    : 'Dit adres kan niet. Een link begint met https:// of met een schuine streep, zoals /bronnen.'
}
