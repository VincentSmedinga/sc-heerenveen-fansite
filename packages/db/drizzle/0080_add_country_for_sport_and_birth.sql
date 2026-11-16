-- Stores two more facts about the country of a person (#1289): the countries he plays for (`P1532`, in `person_sport_countries`) and the country of his birth place (`persons.birth_country_id`, the `P17` of the place, which `wikidata_place_countries` keeps so the importer asks about a place once). `country` stays the one country the site shows. `country_source` gets two values at the end, `wikidata-sport` and `wikidata-birth`, so no row changes and a row that says `wikidata` still means the first nationality. `country_facts_read_at` is empty until the importer stores these facts for a person, which the command `import:country-facts` does once for everyone who was read before.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start. Nothing is written to a row of `persons` but the two new columns, which start empty.
-- The new columns name their character set, because a foreign key needs the same one as `wikidata_items.id`.
-- To undo it on the host: `UPDATE persons SET country = NULL, country_source = NULL WHERE country_source IN ('wikidata-sport', 'wikidata-birth')`, then `ALTER TABLE persons DROP FOREIGN KEY persons_birth_country_id_wikidata_items_id_fk, DROP COLUMN birth_country_id, DROP COLUMN country_facts_read_at, MODIFY COLUMN country_source enum('manual','wikidata','list','squad','old-site')` and `DROP TABLE person_sport_countries, wikidata_place_countries`; the next import fills in the countries of those persons again from the first nationality, the list or the squad. A country the editors set (`manual`) is not touched.
CREATE TABLE IF NOT EXISTS `person_sport_countries` (
	`person_id` int unsigned NOT NULL,
	`position` smallint unsigned NOT NULL,
	`item_id` varchar(20) NOT NULL,
	CONSTRAINT `person_sport_countries_person_id_position_pk` PRIMARY KEY(`person_id`,`position`),
	CONSTRAINT `person_sport_countries_person_id_item_id_unique` UNIQUE(`person_id`,`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `wikidata_place_countries` (
	`id` varchar(20) NOT NULL,
	`country_id` varchar(20),
	CONSTRAINT `wikidata_place_countries_id` PRIMARY KEY(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;--> statement-breakpoint
ALTER TABLE `persons` MODIFY COLUMN `country_source` enum('manual','wikidata','list','squad','old-site','wikidata-sport','wikidata-birth');--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `birth_country_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `country_facts_read_at` datetime;--> statement-breakpoint
ALTER TABLE `person_sport_countries` ADD CONSTRAINT `person_sport_countries_person_id_persons_id_fk` FOREIGN KEY IF NOT EXISTS (`person_id`) REFERENCES `persons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `person_sport_countries` ADD CONSTRAINT `person_sport_countries_item_id_wikidata_items_id_fk` FOREIGN KEY IF NOT EXISTS (`item_id`) REFERENCES `wikidata_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `persons` ADD CONSTRAINT `persons_birth_country_id_wikidata_items_id_fk` FOREIGN KEY IF NOT EXISTS (`birth_country_id`) REFERENCES `wikidata_items`(`id`) ON DELETE no action ON UPDATE no action;
