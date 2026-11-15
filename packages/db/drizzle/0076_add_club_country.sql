-- Gives a club a Wikidata item and a country (#1264): the importer reads the item from the article of the club and the country from `P17`. `country_source` is `wikidata`, or `manual` for a country the editors fill in, which the importer never replaces. `country_item_id` is the country of the item as Wikidata gave it, also when it is not in our list of countries, so the importer can warn about it. `wikidata_read_at` is when the item was read. All five are empty until the importer reads the club.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- `country_item_id` names its character set, because a foreign key needs the same one as `wikidata_items.id`.
-- To undo it on the host: `ALTER TABLE clubs DROP FOREIGN KEY clubs_country_item_id_wikidata_items_id_fk, DROP COLUMN country_item_id, DROP COLUMN wikidata_read_at, DROP COLUMN country_source, DROP COLUMN country, DROP COLUMN wikidata_id`; the countries the editors gave are then gone.
ALTER TABLE `clubs` ADD COLUMN IF NOT EXISTS `wikidata_id` varchar(20);--> statement-breakpoint
ALTER TABLE `clubs` ADD COLUMN IF NOT EXISTS `country` char(2);--> statement-breakpoint
ALTER TABLE `clubs` ADD COLUMN IF NOT EXISTS `country_source` enum('manual','wikidata');--> statement-breakpoint
ALTER TABLE `clubs` ADD COLUMN IF NOT EXISTS `country_item_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;--> statement-breakpoint
ALTER TABLE `clubs` ADD COLUMN IF NOT EXISTS `wikidata_read_at` datetime;--> statement-breakpoint
ALTER TABLE `clubs` ADD UNIQUE INDEX IF NOT EXISTS `clubs_wikidata_id_unique` (`wikidata_id`);--> statement-breakpoint
ALTER TABLE `clubs` ADD CONSTRAINT `clubs_country_item_id_wikidata_items_id_fk` FOREIGN KEY IF NOT EXISTS (`country_item_id`) REFERENCES `wikidata_items`(`id`) ON DELETE no action ON UPDATE no action;
