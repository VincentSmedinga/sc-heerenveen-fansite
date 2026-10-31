// Every page that has no bar of its own in this slot: the slot is empty. Without this route, a
// visit that follows a link from a page with a bar would keep the bar of the page before (see
// layout.tsx). The home page has the same in page.tsx next to this folder.
export default function NoSubnav() {
  return null
}
