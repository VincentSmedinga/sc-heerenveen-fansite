-- Creates the table that marks which parts of a match (the kick-off, the result, the goals) the editors filled in or corrected, with who, when and why, and the match and goals as they were before the first entry. The entry itself is in `matches` and `match_goals`.
-- Lets the log of the admin take the actions of those entries and of the importer, and a line without an account: the importer has none. The log also gets a `detail` for what changed.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
CREATE TABLE IF NOT EXISTS `match_edits` (
	`match_id` int unsigned NOT NULL,
	`kickoff_edited` boolean NOT NULL DEFAULT false,
	`result_edited` boolean NOT NULL DEFAULT false,
	`goals_edited` boolean NOT NULL DEFAULT false,
	`edited_by` int unsigned NOT NULL,
	`edited_at` datetime NOT NULL,
	`reason` varchar(300) NOT NULL,
	`before_match` text NOT NULL,
	`before_goals` text NOT NULL,
	`reported_kickoff` text,
	`reported_result` text,
	`reported_goals` text,
	CONSTRAINT `match_edits_match_id` PRIMARY KEY(`match_id`),
	CONSTRAINT `match_edits_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action,
	CONSTRAINT `match_edits_edited_by_admin_users_id_fk` FOREIGN KEY (`edited_by`) REFERENCES `admin_users`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `match_edits_a_part_is_edited` CHECK(`match_edits`.`kickoff_edited` = 1 or `match_edits`.`result_edited` = 1 or `match_edits`.`goals_edited` = 1)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `user_id` int unsigned;--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `action` enum('item.hide','item.show','article.create','article.update','article.publish','article.unpublish','match.edit','match.undo','match.caught-up','match.differs') NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_log` ADD COLUMN IF NOT EXISTS `detail` varchar(1000);
