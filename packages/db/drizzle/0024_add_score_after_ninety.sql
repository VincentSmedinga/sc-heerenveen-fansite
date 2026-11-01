-- Gives a cup match with extra time the score after 90 minutes, when the page gives it. Both columns are empty or both filled, and the score never exceeds the final one.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `matches` ADD COLUMN IF NOT EXISTS `after_ninety_for` int unsigned;--> statement-breakpoint
ALTER TABLE `matches` ADD COLUMN IF NOT EXISTS `after_ninety_against` int unsigned;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT IF NOT EXISTS `matches_after_ninety_in_a_pair` CHECK ((`matches`.`after_ninety_for` is null and `matches`.`after_ninety_against` is null) or (`matches`.`after_ninety_for` is not null and `matches`.`after_ninety_against` is not null));--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT IF NOT EXISTS `matches_after_ninety_within_extra_time` CHECK (`matches`.`after_ninety_for` is null or (`matches`.`extra_time` = 1 and `matches`.`after_ninety_for` <= `matches`.`goals_for` and `matches`.`after_ninety_against` <= `matches`.`goals_against`));
