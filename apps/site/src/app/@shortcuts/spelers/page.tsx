// /spelers has one card, so it has no bar "Op deze pagina:". The slot is empty here: without
// this route, a visit that follows a link from a page with a bar would keep the bar of the page
// before (see layout.tsx).
export default function PlayersShortcuts() {
  return null
}
