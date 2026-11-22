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
export const localLogin = { email: 'beheer@example.test', firstName: 'Lokaal', role: 'owner' } as const

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
 * The tables that hold the accounts of supporters and what belongs to one account: its
 * sessions, its links and codes, a change of address and the requests for a mail, and the
 * hashes of the addresses of blocked accounts that were closed (issue 1458), and the record of
 * the reminders that were sent (issue 1461). The copy takes none of their rows.
 */
export const supporterTables = [
  'supporter_reminders',
  'supporter_blocked_addresses',
  'supporter_email_changes',
  'supporter_login_attempts',
  'supporter_login_links',
  'supporter_sessions',
  'supporters',
] as const

/**
 * Every table of the schema, with what the export does with it.
 *
 * `structure`: the tables the nightly dump leaves empty too (see `structureOnlyTables` in
 * backup.ts) and `admin_login_attempts`, which holds the hash of an address for 15 minutes.
 *
 * The tables of the accounts of supporters (`supporterTables`) are `structure` too (issue
 * 1462): the copy gets no account of a supporter, not even with a made-up address, because a
 * screen name is chosen by a real person and is often easy to recognise. Unlike `admin_users`,
 * no other table needs their numbers to make sense. The tables are there, so signing up on the
 * owner's computer makes a new account in the copy.
 *
 * The rule for the tables of the games that are still to come: a table that refers to a
 * supporter comes along, but without that reference. The column becomes `NULL` in `replace`, so
 * the predictions and the marks can be looked at, and belong to nobody. export.test.ts fails
 * for a column that refers to `supporters` and is copied as it is.
 *
 * `admin_users`: the address and the first name are what in the database says who an account
 * is. The first name becomes "Account" and the number. The number, the role, the choice for the
 * mail and the times stay, so "who did what" can still be followed as a number.
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
    keep: ['id', 'role', 'conflict_mail', 'created_at', 'disabled_at'],
    replace: { email: "CONCAT('beheerder-', `id`, '@example.invalid')", first_name: "CONCAT('Account ', `id`)" },
  },
  article_versions: 'copy',
  articles: 'copy',
  audit_log: 'copy',
  club_home_grounds: 'copy',
  club_name_periods: 'copy',
  club_names: 'copy',
  club_pages: 'copy',
  club_squad_imports: 'copy',
  club_squad_players: 'copy',
  clubs: 'copy',
  coach_ratings: {
    keep: ['id', 'match_id', 'staff_id', 'grade', 'created_at', 'updated_at'],
    // As for `player_ratings`: a grade of a blocked account stays out of the averages (1479).
    replace: {
      blocked:
        'IF(`blocked` OR EXISTS (SELECT 1 FROM `supporters` WHERE `supporters`.`id` = `supporter_id` AND `supporters`.`disabled_at` IS NOT NULL), 1, 0)',
      supporter_id: 'NULL',
    },
  },
  daily_visitors: 'copy',
  discussions: 'structure',
  fantasy_picks: {
    keep: ['id', 'match_id', 'player_1_id', 'player_2_id', 'player_3_id', 'player_4_id', 'created_at', 'updated_at'],
    replace: { supporter_id: 'NULL' },
  },
  fantasy_player_lines: 'copy',
  feeds: 'copy',
  group_standings: 'copy',
  import_alerts: 'copy',
  import_results: 'copy',
  import_runs: 'copy',
  item_clubs: 'copy',
  items: 'copy',
  league_results: 'copy',
  match_appearances: 'copy',
  match_cards: 'copy',
  match_changes: 'copy',
  match_coach_ratings: 'copy',
  match_edits: 'copy',
  match_goals: 'copy',
  match_imports: 'copy',
  match_incidents: 'copy',
  match_player_ratings: 'copy',
  match_prediction_counts: 'copy',
  match_reports: 'copy',
  match_shootout_kicks: 'copy',
  match_statistics: 'copy',
  match_substitutions: 'copy',
  matches: 'copy',
  old_season_ratings: 'copy',
  page_views: 'copy',
  person_nationalities: 'copy',
  person_pages: 'copy',
  person_positions: 'copy',
  person_slugs: 'copy',
  person_sport_countries: 'copy',
  persons: 'copy',
  player_field_differences: 'copy',
  player_list_titles: 'copy',
  player_ratings: {
    keep: ['id', 'appearance_id', 'grade', 'created_at', 'updated_at'],
    // A grade of a blocked account stays out of the averages in the copy (issue 1476).
    replace: {
      blocked:
        'IF(`blocked` OR EXISTS (SELECT 1 FROM `supporters` WHERE `supporters`.`id` = `supporter_id` AND `supporters`.`disabled_at` IS NOT NULL), 1, 0)',
      supporter_id: 'NULL',
    },
  },
  player_season_stats: 'copy',
  player_stat_differences: 'copy',
  players: 'copy',
  predictions: {
    keep: [
      'id',
      'match_id',
      'halftime_home',
      'halftime_away',
      'full_time_home',
      'full_time_away',
      'created_at',
      'updated_at',
    ],
    replace: { supporter_id: 'NULL' },
  },
  quiz_questions: 'copy',
  quizzes: 'copy',
  robots_txt: 'copy',
  source_clubs: 'copy',
  sources: 'copy',
  squad_completeness: 'copy',
  squad_imports: 'copy',
  stadium_names: 'copy',
  stadiums: 'copy',
  staff: 'copy',
  standings: 'copy',
  supporter_blocked_addresses: 'structure',
  supporter_email_changes: 'structure',
  supporter_login_attempts: 'structure',
  supporter_login_links: 'structure',
  supporter_reminders: 'structure',
  supporter_sessions: 'structure',
  supporters: 'structure',
  unavailable_marks: 'copy',
  visitor_hashes: 'structure',
  visitor_salts: 'structure',
  wikidata_items: 'copy',
  wikidata_place_countries: 'copy',
  wikidata_places: 'copy',
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
