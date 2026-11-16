-- Two columns on `clubs` for the import of the stadiums (#1298): `stadiums_read_at` (when the importer read the home grounds of the item of the club, so it does not ask twice) and `home_grounds_source` (`manual` when the editors set the home grounds, so the importer leaves the club alone). No row changes.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `ALTER TABLE clubs DROP COLUMN stadiums_read_at, DROP COLUMN home_grounds_source`.
ALTER TABLE `clubs` ADD COLUMN IF NOT EXISTS `stadiums_read_at` datetime;--> statement-breakpoint
ALTER TABLE `clubs` ADD COLUMN IF NOT EXISTS `home_grounds_source` enum('manual','wikidata');
