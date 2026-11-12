-- Gives the birth date of a person a source (#1164), as the date of death has one: `wikidata` from `P569`, or `manual` for a year or a day the editors fill in, which the importer never replaces. Every birth date that is there came from Wikidata, so it gets that source.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `ALTER TABLE persons DROP COLUMN birth_date_source`; the dates the editors filled in then count as Wikidata's, and the next read of a person replaces them.
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `birth_date_source` enum('wikidata','manual');--> statement-breakpoint
UPDATE `persons` SET `birth_date_source` = 'wikidata' WHERE `birth_date` IS NOT NULL AND `birth_date_source` IS NULL;
