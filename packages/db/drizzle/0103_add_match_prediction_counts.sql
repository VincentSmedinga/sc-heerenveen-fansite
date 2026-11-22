-- Adds `match_prediction_counts` for #1457: how many supporters of the old fansite predicted a half-time or full-time score in a match. No row is written; the import of the old fansite fills it.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE match_prediction_counts`; only these counts are lost.
CREATE TABLE IF NOT EXISTS `match_prediction_counts` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`match_id` int unsigned NOT NULL,
	`source` enum('oude-fansite') NOT NULL,
	`kind` enum('half_time','full_time') NOT NULL,
	`home` smallint unsigned NOT NULL,
	`away` smallint unsigned NOT NULL,
	`prediction_count` int unsigned NOT NULL,
	CONSTRAINT `match_prediction_counts_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_prediction_counts_score_unique` UNIQUE(`match_id`,`source`,`kind`,`home`,`away`),
	CONSTRAINT `match_prediction_counts_count_positive` CHECK(`match_prediction_counts`.`prediction_count` > 0)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `match_prediction_counts` ADD CONSTRAINT `match_prediction_counts_match_id_matches_id_fk` FOREIGN KEY IF NOT EXISTS (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action;
