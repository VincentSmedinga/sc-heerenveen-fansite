-- Gives a match of the cup its extra time and the score of its shoot-out. A match that is there keeps no extra time and no shoot-out.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `matches` ADD COLUMN IF NOT EXISTS `extra_time` boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `matches` ADD COLUMN IF NOT EXISTS `penalties_for` int unsigned;
--> statement-breakpoint
ALTER TABLE `matches` ADD COLUMN IF NOT EXISTS `penalties_against` int unsigned;
--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT IF NOT EXISTS `matches_extra_time_only_in_played_cup` CHECK (`matches`.`extra_time` = 0 or (`matches`.`status` = 'played' and `matches`.`competition` = 'KNVB Beker'));
--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT IF NOT EXISTS `matches_penalties_in_a_pair` CHECK ((`matches`.`penalties_for` is null and `matches`.`penalties_against` is null) or (`matches`.`penalties_for` is not null and `matches`.`penalties_against` is not null));
--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT IF NOT EXISTS `matches_penalties_after_level_extra_time` CHECK (`matches`.`penalties_for` is null or (`matches`.`extra_time` = 1 and `matches`.`goals_for` = `matches`.`goals_against`));
