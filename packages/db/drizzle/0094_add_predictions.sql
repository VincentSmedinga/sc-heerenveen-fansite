-- Adds `predictions` for #1447: the half-time and full-time score a supporter predicts for a match. No row is written.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE predictions`; only the predictions are lost.
CREATE TABLE IF NOT EXISTS `predictions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`supporter_id` int unsigned,
	`match_id` int unsigned NOT NULL,
	`halftime_home` smallint unsigned NOT NULL,
	`halftime_away` smallint unsigned NOT NULL,
	`full_time_home` smallint unsigned NOT NULL,
	`full_time_away` smallint unsigned NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	`updated_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	CONSTRAINT `predictions_id` PRIMARY KEY(`id`),
	CONSTRAINT `predictions_supporter_id_match_id_unique` UNIQUE(`supporter_id`,`match_id`),
	CONSTRAINT `predictions_goals_in_range` CHECK(`predictions`.`halftime_home` <= 9 and `predictions`.`halftime_away` <= 9 and `predictions`.`full_time_home` <= 9 and `predictions`.`full_time_away` <= 9)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `predictions` ADD CONSTRAINT `predictions_supporter_id_supporters_id_fk` FOREIGN KEY IF NOT EXISTS (`supporter_id`) REFERENCES `supporters`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `predictions` ADD CONSTRAINT `predictions_match_id_matches_id_fk` FOREIGN KEY IF NOT EXISTS (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `predictions_match_id_idx` ON `predictions` (`match_id`);
