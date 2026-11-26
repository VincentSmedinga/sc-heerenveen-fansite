-- Adds `opponent_name_searches` for #1678: when the importer looked on Wikipedia for a player of an opponent, per name, club and season. No row is written.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE opponent_name_searches`; the importer then searches every name again, so only do that together with the code from before.
CREATE TABLE IF NOT EXISTS `opponent_name_searches` (
	`name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
	`club_id` int unsigned NOT NULL,
	`season` varchar(7) NOT NULL,
	`searched_at` datetime NOT NULL,
	CONSTRAINT `opponent_name_searches_name_club_id_season_pk` PRIMARY KEY(`name`,`club_id`,`season`),
	CONSTRAINT `opponent_name_searches_club_id_clubs_id_fk` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE cascade ON UPDATE no action
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
