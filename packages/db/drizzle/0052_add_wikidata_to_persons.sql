-- Gives a person what Wikidata knows (#898): the Q-number, the number of the Dutch article, the birth date with its precision, the birth place, the line and where the line came from, and the moment the importer read the item. The nationalities and positions get a table each, and the names of countries, places and positions a table of their own. Everything starts empty and the importer fills it at its next runs, at most 200 persons a run.
-- The migration only adds. To undo it on the host, drop the three new tables and the eight new columns of `persons` (`DROP TABLE person_nationalities, person_positions, wikidata_items`, then the foreign key `persons_birth_place_id_wikidata_items_id_fk`, the index `persons_wikidata_id_unique` and the columns); no other data is lost, and the importer reads the persons again.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
CREATE TABLE IF NOT EXISTS `wikidata_items` (
	`id` varchar(20) NOT NULL,
	`label` varchar(255) NOT NULL,
	CONSTRAINT `wikidata_items_id` PRIMARY KEY(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `wikidata_id` varchar(20);--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `wikipedia_page_id` int unsigned;--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `birth_date` date;--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `birth_date_precision` enum('day','month','year');--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `birth_place_id` varchar(20);--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `line` enum('doelman','verdediger','middenvelder','aanvaller');--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `line_source` enum('wikidata','squad','manual');--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `wikidata_read_at` datetime;--> statement-breakpoint
ALTER TABLE `persons` ADD UNIQUE INDEX IF NOT EXISTS `persons_wikidata_id_unique` (`wikidata_id`);--> statement-breakpoint
ALTER TABLE `persons` ADD CONSTRAINT `persons_birth_place_id_wikidata_items_id_fk` FOREIGN KEY IF NOT EXISTS (`birth_place_id`) REFERENCES `wikidata_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `person_nationalities` (
	`person_id` int unsigned NOT NULL,
	`position` smallint unsigned NOT NULL,
	`item_id` varchar(20) NOT NULL,
	CONSTRAINT `person_nationalities_person_id_position_pk` PRIMARY KEY(`person_id`,`position`),
	CONSTRAINT `person_nationalities_person_id_item_id_unique` UNIQUE(`person_id`,`item_id`),
	CONSTRAINT `person_nationalities_person_id_persons_id_fk` FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON DELETE cascade ON UPDATE no action,
	CONSTRAINT `person_nationalities_item_id_wikidata_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `wikidata_items`(`id`) ON DELETE no action ON UPDATE no action
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `person_positions` (
	`person_id` int unsigned NOT NULL,
	`position` smallint unsigned NOT NULL,
	`item_id` varchar(20) NOT NULL,
	CONSTRAINT `person_positions_person_id_position_pk` PRIMARY KEY(`person_id`,`position`),
	CONSTRAINT `person_positions_person_id_item_id_unique` UNIQUE(`person_id`,`item_id`),
	CONSTRAINT `person_positions_person_id_persons_id_fk` FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON DELETE cascade ON UPDATE no action,
	CONSTRAINT `person_positions_item_id_wikidata_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `wikidata_items`(`id`) ON DELETE no action ON UPDATE no action
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
