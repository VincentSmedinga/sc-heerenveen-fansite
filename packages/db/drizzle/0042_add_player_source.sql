-- Lets a player be kept without a position, and gives every player row a source: how complete the list was that the row came from (#738). Existing rows get `selectie`, which they are.
-- The migration only adds or widens. To undo it on the host, drop the column `source`; to make `position` required again, first check that no row is empty (`SELECT COUNT(*) FROM players WHERE position IS NULL`), and only then run `ALTER TABLE players MODIFY COLUMN position enum('doelman','verdediger','middenvelder','aanvaller') NOT NULL`.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `players` MODIFY COLUMN `position` enum('doelman','verdediger','middenvelder','aanvaller');--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN IF NOT EXISTS `source` enum('selectie','statistieken','engels','transfers','doelpunten','wikidata') DEFAULT 'selectie' NOT NULL;
