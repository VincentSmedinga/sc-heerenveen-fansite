-- Lets the editors add a match that has no source to read: `data_source` gets the value `redactie`, and `source_line` holds where the editors took the match from (such as `Leeuwarder Courant, 12 mei 2009`), which is required for such a match.
-- A match of the editors, like one of the old fansite, may have a day and no time, so `matches_time_or_text` only asks for a time or a text of a match from Wikipedia.
-- The log of the admin gets `match.add` and `match.delete`.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `matches` DROP CONSTRAINT IF EXISTS `matches_time_or_text`;--> statement-breakpoint
ALTER TABLE `matches` DROP CONSTRAINT IF EXISTS `matches_source_line_for_editors`;--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `action` enum('item.hide','item.show','article.create','article.update','article.publish','article.unpublish','match.edit','match.undo','match.caught-up','match.differs','match.take-over','match.keep','match.add','match.delete','stadium.save','stadium.reset','club-name.save','club-name.reset','player.stats-differ') NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `data_source` enum('wikipedia','oude-fansite','redactie') NOT NULL DEFAULT 'wikipedia';--> statement-breakpoint
ALTER TABLE `matches` ADD COLUMN IF NOT EXISTS `source_line` varchar(255);--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_source_line_for_editors` CHECK (`matches`.`data_source` <> 'redactie' or coalesce(char_length(`matches`.`source_line`), 0) > 0);--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_time_or_text` CHECK (`matches`.`data_source` <> 'wikipedia' or `matches`.`kickoff_at` is not null or `matches`.`date_text` is not null);
