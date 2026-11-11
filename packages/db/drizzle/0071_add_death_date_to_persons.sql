-- Gives a person a date of death with its precision and its source (#1147): from Wikidata (`P570`) or a year the editors fill in. All three columns start empty for every row that is there, and the importer reads persons without a date of death again every 30 days.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `ALTER TABLE persons DROP COLUMN death_date_source, DROP COLUMN death_date_precision, DROP COLUMN death_date`; the years the editors filled in are lost with it.
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `death_date` date;--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `death_date_precision` enum('day','month','year');--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `death_date_source` enum('wikidata','manual');
