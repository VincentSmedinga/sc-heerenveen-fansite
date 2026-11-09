-- Gives a player the country code of the flag in the selection table of the Dutch Wikipedia (#946): two letters, such as `NL`. Every player starts with an empty value and the importer fills it at its next run of a season.
-- The migration only adds. To undo it on the host: `ALTER TABLE players DROP COLUMN country`; no other data is lost, and the importer reads the country again.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `players` ADD COLUMN IF NOT EXISTS `country` char(2);
