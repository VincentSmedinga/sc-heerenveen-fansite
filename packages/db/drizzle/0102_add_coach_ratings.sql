-- Adds `match_coach_ratings` for #1502: the averages of the ratings that supporters gave the head coach in a match. No row is written; the import of the old fansite fills it.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE match_coach_ratings`; only the coach ratings are lost.
CREATE TABLE IF NOT EXISTS `match_coach_ratings` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`match_id` int unsigned NOT NULL,
	`staff_id` int unsigned NOT NULL,
	`source` enum('oude-fansite','fans') NOT NULL,
	`average` decimal(4,2) NOT NULL,
	`rating_count` int unsigned NOT NULL,
	`spread` decimal(4,2) NOT NULL,
	CONSTRAINT `match_coach_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_coach_ratings_match_staff_source_unique` UNIQUE(`match_id`,`staff_id`,`source`),
	CONSTRAINT `match_coach_ratings_count_positive` CHECK(`match_coach_ratings`.`rating_count` > 0),
	CONSTRAINT `match_coach_ratings_average_in_range` CHECK(`match_coach_ratings`.`average` between 1 and 10)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `match_coach_ratings` ADD CONSTRAINT `match_coach_ratings_match_id_matches_id_fk` FOREIGN KEY IF NOT EXISTS (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `match_coach_ratings` ADD CONSTRAINT `match_coach_ratings_staff_id_staff_id_fk` FOREIGN KEY IF NOT EXISTS (`staff_id`) REFERENCES `staff`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `match_coach_ratings_staff_id_idx` ON `match_coach_ratings` (`staff_id`);
