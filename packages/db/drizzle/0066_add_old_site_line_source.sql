-- Lets the line of a person come from the table of players of the old fansite (#1052): `old-site` is a new value of `line_source`, at the end, so no row changes. `country_source` has the value already, from #1051.
-- The list of players keeps the country of the first flag on the line of a title, so the importer can give it to the person of that title. It is empty until the next read of the list.
-- To undo it on the host: `UPDATE persons SET line = NULL, line_source = NULL WHERE line_source = 'old-site'`, then `ALTER TABLE persons MODIFY COLUMN line_source enum('wikidata','squad','manual')` and `ALTER TABLE player_list_titles DROP COLUMN country`; the importer fills in the lines of the squad again.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `persons` MODIFY COLUMN `line_source` enum('wikidata','squad','manual','old-site');--> statement-breakpoint
ALTER TABLE `player_list_titles` ADD COLUMN IF NOT EXISTS `country` char(2);
