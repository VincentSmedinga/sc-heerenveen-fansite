-- Gives a match report a formation for each team, such as `4-3-3`, or none (#840). Both columns start empty, so a report that was stored before keeps no formation.
-- The migration only adds. To undo it on the host, drop the two checks and then the two columns of `match_reports`: `ALTER TABLE match_reports DROP CONSTRAINT match_reports_formation_ours_shape, DROP CONSTRAINT match_reports_formation_opponent_shape, DROP COLUMN formation_ours, DROP COLUMN formation_opponent`. Only the formations are lost.
-- The checks only hold the shape (numbers with a hyphen between them). That the numbers add up to ten is a rule of the report, in `@fansite/shared`.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `match_reports` ADD COLUMN IF NOT EXISTS `formation_ours` varchar(20);
--> statement-breakpoint
ALTER TABLE `match_reports` ADD COLUMN IF NOT EXISTS `formation_opponent` varchar(20);
--> statement-breakpoint
ALTER TABLE `match_reports` ADD CONSTRAINT IF NOT EXISTS `match_reports_formation_ours_shape` CHECK (`formation_ours` is null or `formation_ours` regexp '^[1-9][0-9]*(-[1-9][0-9]*)*$');
--> statement-breakpoint
ALTER TABLE `match_reports` ADD CONSTRAINT IF NOT EXISTS `match_reports_formation_opponent_shape` CHECK (`formation_opponent` is null or `formation_opponent` regexp '^[1-9][0-9]*(-[1-9][0-9]*)*$');
