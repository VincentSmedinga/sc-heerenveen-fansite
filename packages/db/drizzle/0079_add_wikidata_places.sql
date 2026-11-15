-- Adds `wikidata_places` (#1278): for each item of Wikidata that the importer followed on its way from a club of the United Kingdom to England, Wales, Scotland or Northern Ireland, the Q-numbers of its headquarters (`P159`) and the places it lies in (`P131`), separated by commas. The importer asks about an item once. Nothing else changes, and no row of another table.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `DROP TABLE wikidata_places`; the next import asks about those items again.
CREATE TABLE IF NOT EXISTS `wikidata_places` (
	`id` varchar(20) NOT NULL,
	`parent_ids` text NOT NULL,
	CONSTRAINT `wikidata_places_id` PRIMARY KEY(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
