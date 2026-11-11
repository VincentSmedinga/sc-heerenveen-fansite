-- Gives a player of a season a previous shirt number and the day from which the number now counts (#1076): both start empty, only the editors fill them, and the importer leaves them alone. A row that was there stays as it was.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `ALTER TABLE players DROP CONSTRAINT players_shirt_number_change_complete, DROP CONSTRAINT players_previous_shirt_number_range, DROP COLUMN shirt_number_from, DROP COLUMN previous_shirt_number`; the numbers and days the editors filled in are lost with it.
ALTER TABLE `players` ADD COLUMN IF NOT EXISTS `previous_shirt_number` int unsigned;--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN IF NOT EXISTS `shirt_number_from` date;--> statement-breakpoint
ALTER TABLE `players` ADD CONSTRAINT IF NOT EXISTS `players_previous_shirt_number_range` CHECK (`previous_shirt_number` is null or `previous_shirt_number` between 1 and 99);--> statement-breakpoint
ALTER TABLE `players` ADD CONSTRAINT IF NOT EXISTS `players_shirt_number_change_complete` CHECK ((`previous_shirt_number` is null) = (`shirt_number_from` is null));
