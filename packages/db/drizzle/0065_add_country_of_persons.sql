-- Gives a person a country (#1051): the code of two letters, such as `NL`, and where it came from. Every person starts with both empty, and the importer fills the country from the first nationality of Wikidata at its next run.
-- The migration only adds. To undo it on the host: `ALTER TABLE persons DROP COLUMN country_source, DROP COLUMN country`; what the editors set in the admin is lost with it, and the importer fills in the rest again.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `country` char(2);--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `country_source` enum('manual','wikidata','list','squad','old-site');
