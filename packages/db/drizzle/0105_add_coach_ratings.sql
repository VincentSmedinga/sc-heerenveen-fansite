-- Adds `coach_ratings` for #1478: the grade from 1 to 10 that a supporter gives the head coach of the last match in the game Uitblinker. No row is written; the form of the game fills it.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE coach_ratings`; only the grades of supporters are lost, not the averages in `match_coach_ratings`.
CREATE TABLE IF NOT EXISTS `coach_ratings` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`supporter_id` int unsigned,
	`match_id` int unsigned NOT NULL,
	`staff_id` int unsigned NOT NULL,
	`grade` tinyint unsigned NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	`updated_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	CONSTRAINT `coach_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `coach_ratings_supporter_id_match_id_unique` UNIQUE(`supporter_id`,`match_id`),
	CONSTRAINT `coach_ratings_grade_in_range` CHECK(`coach_ratings`.`grade` between 1 and 10)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `coach_ratings` ADD CONSTRAINT `coach_ratings_supporter_id_supporters_id_fk` FOREIGN KEY IF NOT EXISTS (`supporter_id`) REFERENCES `supporters`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `coach_ratings` ADD CONSTRAINT `coach_ratings_match_id_matches_id_fk` FOREIGN KEY IF NOT EXISTS (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `coach_ratings` ADD CONSTRAINT `coach_ratings_staff_id_staff_id_fk` FOREIGN KEY IF NOT EXISTS (`staff_id`) REFERENCES `staff`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `coach_ratings_match_id_idx` ON `coach_ratings` (`match_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `coach_ratings_staff_id_idx` ON `coach_ratings` (`staff_id`);
