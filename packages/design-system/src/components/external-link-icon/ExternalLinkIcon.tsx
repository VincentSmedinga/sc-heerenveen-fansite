/**
 * A square with an arrow out of its corner: the link goes to another site. It is drawn here, so nothing loads from
 * elsewhere, and it takes the colour of the text around it. The link is named by its own text alone, so the icon is
 * hidden from assistive technology. The size, the space before it and its place in the line are in
 * external-link-icon.css. It is not exported from the package: NewsItem and Navigation draw it for the visitor.
 */
export const ExternalLinkIcon = () => (
  <svg
    aria-hidden="true"
    className="hf-external-link-icon"
    fill="none"
    focusable="false"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 16 16"
  >
    <path d="M9.5 2.5h4v4" />
    <path d="M13.5 2.5 7.5 8.5" />
    <path d="M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" />
  </svg>
)
