// What `backup.mjs export` does with each table, for the copy of the acceptance database on
// the owner's computer (see docs/back-ups.md, _Een kopie van acceptatie_). The export only
// takes tables and columns that are named here: a table or a column this file doesn't know
// stops it. A test compares the list with the schema, so a new table can't be forgotten.

/** The local database of the copy. No worktree gets this name (scripts/worktree-env.js). */
export const acceptanceCopyDatabase = 'fansite_acc'

/**
 * The table the export adds, outside the schema of the site: when the dump was made on the host
 * and when it was loaded, both UTC. Whoever queries the copy reads its age here.
 */
export const copyInfoTable = 'acceptance_copy'

/** The address of account `id` in the copy. `.invalid` never gets mail (RFC 2606). */
export const madeUpAddress = (id: number | string) => `beheerder-${id}@example.invalid`

/** The one account the copy gets to log in with, on the owner's computer only. */
export const localLogin = { email: 'beheer@example.test', role: 'beheerder' } as const

export type ExportRule =
  /** All rows, as they are. */
  | 'copy'
  /** The table without its rows. */
  | 'structure'
  /**
   * The rows with the columns in `keep` as they are, and each column in `replace` as the SQL
   * expression next to it. Every column of the table is in one of the two.
   */
  | { keep: readonly string[]; replace: Readonly<Record<string, string>> }

/**
 * Every table of the schema, with what the export does with it.
 *
 * `structure`: the five tables the nightly dump leaves empty too (see `structureOnlyTables` in
 * backup.ts) and `admin_login_attempts`, which holds the hash of an address for 15 minutes.
 *
 * `admin_users`: the address is the only thing in the database that says who an account is. The
 * number, the role and the times stay, so "who did what" can still be followed as a number.
 * The real address is never read: the query asks for the made-up one.
 *
 * Everything else is copied. It is what the site shows, what the importer read from public
 * sources, the work of the editors and the logs, which name an account by its number.
 */
export const exportPlan: Readonly<Record<string, ExportRule>> = {
  admin_login_attempts: 'structure',
  admin_login_links: 'structure',
  admin_sessions: 'structure',
  admin_users: {
    keep: ['id', 'role', 'created_at', 'disabled_at'],
    replace: { email: "CONCAT('beheerder-', `id`, '@example.invalid')" },
  },
  article_versions: 'copy',
  articles: 'copy',
  audit_log: 'copy',
  club_name_periods: 'copy',
  club_names: 'copy',
  club_pages: 'copy',
  club_stadiums: 'copy',
  clubs: 'copy',
  daily_visitors: 'copy',
  discussions: 'structure',
  feeds: 'copy',
  import_alerts: 'copy',
  import_results: 'copy',
  import_runs: 'copy',
  item_clubs: 'copy',
  items: 'copy',
  league_results: 'copy',
  match_appearances: 'copy',
  match_cards: 'copy',
  match_changes: 'copy',
  match_edits: 'copy',
  match_goals: 'copy',
  match_imports: 'copy',
  match_incidents: 'copy',
  match_reports: 'copy',
  match_shootout_kicks: 'copy',
  match_statistics: 'copy',
  match_substitutions: 'copy',
  matches: 'copy',
  page_views: 'copy',
  person_nationalities: 'copy',
  person_pages: 'copy',
  person_positions: 'copy',
  person_slugs: 'copy',
  persons: 'copy',
  player_field_differences: 'copy',
  player_list_titles: 'copy',
  player_season_stats: 'copy',
  player_stat_differences: 'copy',
  players: 'copy',
  robots_txt: 'copy',
  sources: 'copy',
  squad_completeness: 'copy',
  squad_imports: 'copy',
  staff: 'copy',
  standings: 'copy',
  visitor_hashes: 'structure',
  visitor_salts: 'structure',
  wikidata_items: 'copy',
  wikipedia_pages: 'copy',
}

/**
 * The tables that are in a database but not in the schema, and that the export copies: the
 * list of migrations that Drizzle keeps. With it the site starts on the copy without running
 * every migration again.
 */
export const copiedTablesOutsideSchema = ['__drizzle_migrations'] as const

/**
 * A column of a copied table whose name sounds like something about a person, with why it may
 * go along. The test asks for a line here for every such column, so someone looks at a new one.
 */
export const reviewedColumns: Readonly<Record<string, string>> = {
  'import_alerts.mailed_at': 'the time of a mail to the owner, not an address',
  'match_changes.mailed_at': 'the time of a mail to the owner, not an address',
  'match_changes.taken_over_mailed_at': 'the time of a mail to the owner, not an address',
}

/** The names that make the test ask for a line in `reviewedColumns`. */
export const personalColumnPattern = /mail|address|password|secret|token|salt|hash|phone|session|agent|(^|_)ip(_|$)/
