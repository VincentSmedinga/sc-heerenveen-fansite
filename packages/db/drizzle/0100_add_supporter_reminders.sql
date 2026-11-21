-- Adds `supporter_reminders` for #1461: which reminder by e-mail went out to which supporter for which match, so none goes out twice. No row is written by the migration; it holds no address and no name.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE supporter_reminders`; only the record of the sent reminders is lost, and the next run may send them again.
CREATE TABLE IF NOT EXISTS `supporter_reminders` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`supporter_id` int unsigned NOT NULL,
	`match_id` int unsigned NOT NULL,
	`sent_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	CONSTRAINT `supporter_reminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `supporter_reminders_supporter_id_match_id_unique` UNIQUE(`supporter_id`,`match_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `supporter_reminders` ADD CONSTRAINT `supporter_reminders_supporter_id_supporters_id_fk` FOREIGN KEY IF NOT EXISTS (`supporter_id`) REFERENCES `supporters`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `supporter_reminders` ADD CONSTRAINT `supporter_reminders_match_id_matches_id_fk` FOREIGN KEY IF NOT EXISTS (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `supporter_reminders_match_id_idx` ON `supporter_reminders` (`match_id`);
