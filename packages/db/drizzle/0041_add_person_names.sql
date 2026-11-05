-- Gives every person a name in parts: the name, the given name, the prefix of the family name ("van", "van der"), the family name and where it came from (#715). The columns start empty and the importer fills them at its next run.
-- The migration only adds. To undo it on the host, drop the five columns; no other data is lost.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `name` varchar(255);--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `given_name` varchar(100);--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `family_name_prefix` varchar(30);--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `family_name` varchar(150);--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `name_source` enum('sort_key','guess','manual');
