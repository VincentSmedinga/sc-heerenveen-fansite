-- Adds `player_ratings` for #1470: the grade from 1 to 10 that a supporter gives a player of the last match in the game Uitblinker. No row is written; the form of the game fills it.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE player_ratings`; only the grades of supporters are lost, not the averages in `match_player_ratings`.
CREATE TABLE IF NOT EXISTS `player_ratings` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`supporter_id` int unsigned,
	`appearance_id` int unsigned NOT NULL,
	`grade` tinyint unsigned NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	`updated_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	CONSTRAINT `player_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `player_ratings_supporter_id_appearance_id_unique` UNIQUE(`supporter_id`,`appearance_id`),
	CONSTRAINT `player_ratings_grade_in_range` CHECK(`player_ratings`.`grade` between 1 and 10)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `player_ratings` ADD CONSTRAINT `player_ratings_supporter_id_supporters_id_fk` FOREIGN KEY IF NOT EXISTS (`supporter_id`) REFERENCES `supporters`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `player_ratings` ADD CONSTRAINT `player_ratings_appearance_id_match_appearances_id_fk` FOREIGN KEY IF NOT EXISTS (`appearance_id`) REFERENCES `match_appearances`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `player_ratings_appearance_id_idx` ON `player_ratings` (`appearance_id`);
