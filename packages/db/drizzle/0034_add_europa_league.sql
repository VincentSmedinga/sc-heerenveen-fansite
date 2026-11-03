-- Lets a match be a match of the Europa League, and lets a Wikipedia page be the page of those matches: the one page of the English Wikipedia the importer reads. Extra time and a shoot-out are possible in the Europa League too.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `matches` DROP CONSTRAINT IF EXISTS `matches_extra_time_only_in_played_knockout`;--> statement-breakpoint
ALTER TABLE `match_changes` MODIFY COLUMN `competition` enum('Eredivisie','KNVB Beker','Play-offs Conference League','Europa League') NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `competition` enum('Eredivisie','KNVB Beker','Play-offs Conference League','Europa League') NOT NULL;--> statement-breakpoint
ALTER TABLE `wikipedia_pages` MODIFY COLUMN `kind` enum('standings','programme','cup','playoffs','europa-league','squad') NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT IF NOT EXISTS `matches_extra_time_only_in_played_knockout` CHECK (`matches`.`extra_time` = 0 or (`matches`.`status` = 'played' and `matches`.`competition` in ('KNVB Beker', 'Play-offs Conference League', 'Europa League')));
