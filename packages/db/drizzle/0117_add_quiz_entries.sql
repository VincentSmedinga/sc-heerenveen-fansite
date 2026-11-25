-- Adds `quiz_entries` for #1482: what a supporter sends in for the Fantest of the month, one row per supporter and quiz. No row is written.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE quiz_entries`; only the answers of supporters are lost.
CREATE TABLE IF NOT EXISTS `quiz_entries` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`supporter_id` int unsigned,
	`quiz_id` int unsigned NOT NULL,
	`answers` json NOT NULL,
	`score` tinyint unsigned NOT NULL,
	`blocked` boolean NOT NULL DEFAULT false,
	`submitted_at` datetime NOT NULL,
	CONSTRAINT `quiz_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `quiz_entries_supporter_id_quiz_id_unique` UNIQUE(`supporter_id`,`quiz_id`),
	CONSTRAINT `quiz_entries_score_in_range` CHECK(`quiz_entries`.`score` <= 10),
	CONSTRAINT `quiz_entries_ten_answers` CHECK(json_length(`quiz_entries`.`answers`) = 10)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `quiz_entries` ADD CONSTRAINT `quiz_entries_supporter_id_supporters_id_fk` FOREIGN KEY IF NOT EXISTS (`supporter_id`) REFERENCES `supporters`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_entries` ADD CONSTRAINT `quiz_entries_quiz_id_quizzes_id_fk` FOREIGN KEY IF NOT EXISTS (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `quiz_entries_quiz_id_idx` ON `quiz_entries` (`quiz_id`);