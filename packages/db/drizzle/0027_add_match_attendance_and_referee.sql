-- Gives a match the number of spectators and the name of the referee, as Wikipedia gives them. Both are empty when the page does not give them. The number is between 0 (no audience) and 150000, and only for a played match; the name is never an empty text.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `matches` ADD COLUMN IF NOT EXISTS `attendance` int unsigned;--> statement-breakpoint
ALTER TABLE `matches` ADD COLUMN IF NOT EXISTS `referee` varchar(100);--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT IF NOT EXISTS `matches_attendance_in_range_when_played` CHECK (`matches`.`attendance` is null or (`matches`.`status` = 'played' and `matches`.`attendance` <= 150000));--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT IF NOT EXISTS `matches_referee_not_empty` CHECK (`matches`.`referee` is null or char_length(`matches`.`referee`) > 0);
