-- Adds `clubs.colour_choice` for #1677: the colour the editors chose for a club, `#rrggbb` or `none`. It starts empty, so the list in the code decides.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `ALTER TABLE clubs DROP CONSTRAINT clubs_colour_format, DROP COLUMN colour_choice`, together with the code from before; the choices of the editors are then lost.
ALTER TABLE `clubs` ADD COLUMN IF NOT EXISTS `colour_choice` varchar(7);--> statement-breakpoint
ALTER TABLE `clubs` ADD CONSTRAINT IF NOT EXISTS `clubs_colour_format` CHECK (`clubs`.`colour_choice` regexp '(?-i)^(none|#[0-9a-f]{6})$');
