-- Lets a change that waits in `match_changes` be a difference between Wikipedia and an entry of the editors: `part` says which part of the match (the kick-off, the result or the goals), and `mailed_at` and `taken_over_mailed_at` say when the beheerders were mailed about it.
-- Lets the log of the admin take the two decisions about such a difference.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `audit_log` MODIFY COLUMN `action` enum('item.hide','item.show','article.create','article.update','article.publish','article.unpublish','match.edit','match.undo','match.caught-up','match.differs','match.take-over','match.keep') NOT NULL;--> statement-breakpoint
ALTER TABLE `match_changes` ADD COLUMN IF NOT EXISTS `part` enum('kickoff','result','goals');--> statement-breakpoint
ALTER TABLE `match_changes` ADD COLUMN IF NOT EXISTS `mailed_at` datetime;--> statement-breakpoint
ALTER TABLE `match_changes` ADD COLUMN IF NOT EXISTS `taken_over_mailed_at` datetime;
