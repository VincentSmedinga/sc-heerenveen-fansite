-- Creates the table with the results of the league matches of every club in the Eredivisie, one row per played match, for the form of a club over its last matches. The importer fills it from the programme page it already reads.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
CREATE TABLE IF NOT EXISTS `league_results` (
	`season` varchar(7) NOT NULL,
	`home_club` varchar(100) NOT NULL,
	`away_club` varchar(100) NOT NULL,
	`round` int unsigned NOT NULL,
	`played_on` date NOT NULL,
	`home_goals` int unsigned NOT NULL,
	`away_goals` int unsigned NOT NULL,
	CONSTRAINT `league_results_season_home_away` PRIMARY KEY(`season`,`home_club`,`away_club`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
