-- Lets a match be a match of the play-offs for the Europa League, before 2020/21. Extra time and a shoot-out are possible there too.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `matches` DROP CONSTRAINT IF EXISTS `matches_extra_time_only_in_played_knockout`;--> statement-breakpoint
ALTER TABLE `match_changes` MODIFY COLUMN `competition` enum('Eredivisie','KNVB Beker','Play-offs Conference League','Europa League','Play-offs Europa League') NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `competition` enum('Eredivisie','KNVB Beker','Play-offs Conference League','Europa League','Play-offs Europa League') NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT IF NOT EXISTS `matches_extra_time_only_in_played_knockout` CHECK (`matches`.`extra_time` = 0 or (`matches`.`status` = 'played' and `matches`.`competition` in ('KNVB Beker', 'Play-offs Conference League', 'Europa League', 'Play-offs Europa League')));
