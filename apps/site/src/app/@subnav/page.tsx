// The home page has no bar of its own in this slot: the main menu draws the bar of Nieuws from
// fixed links. Without this route, a visit that follows a link from a page with a bar would
// keep the bar of the page before (see layout.tsx).
export default function NoSubnav() {
  return null
}
