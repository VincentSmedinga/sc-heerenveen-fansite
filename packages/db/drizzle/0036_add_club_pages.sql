-- Makes a table with the titles of the Wikipedia articles of a club, the redirects to its article included, so the importer asks Wikipedia once whether a title is a redirect and remembers the answer. The table starts empty: the importer fills it at the start of its next run.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
CREATE TABLE IF NOT EXISTS `club_pages` (
	`page` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
	`club_id` int unsigned NOT NULL,
	CONSTRAINT `club_pages_page` PRIMARY KEY(`page`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `club_pages` ADD FOREIGN KEY IF NOT EXISTS `club_pages_club_id_clubs_id_fk` (`club_id`) REFERENCES `clubs`(`id`) ON DELETE cascade ON UPDATE no action;
