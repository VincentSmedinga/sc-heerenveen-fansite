-- Creates the table in which the importer keeps the changes of a match that it judged by how reliable they look: a suspicious change waits here until it has stood for seven days or a person decides, and a correction of a few hours old is kept to see a match that flips back and forth.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
CREATE TABLE IF NOT EXISTS `match_changes` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`season` varchar(7) NOT NULL,
	`competition` enum('Eredivisie','KNVB Beker','Play-offs Conference League') NOT NULL,
	`round` varchar(60) NOT NULL,
	`match_id` int unsigned,
	`changed` varchar(100) NOT NULL,
	`class` enum('improvement','suspicious') NOT NULL,
	`reason` varchar(300) NOT NULL,
	`old_value` text NOT NULL,
	`new_value` text,
	`proposal` text,
	`status` enum('pending','accepted','rejected') NOT NULL,
	`resolution` enum('applied','stood','person','reverted','replaced'),
	`first_seen_at` datetime NOT NULL,
	`last_seen_at` datetime NOT NULL,
	`times_seen` int unsigned NOT NULL DEFAULT 1,
	`decided_at` datetime,
	CONSTRAINT `match_changes_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_changes_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE set null ON UPDATE no action,
	INDEX `match_changes_season_status_idx` (`season`,`status`),
	INDEX `match_changes_match_idx` (`season`,`competition`,`round`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
