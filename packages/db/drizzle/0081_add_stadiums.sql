-- Makes a stadium a thing of its own (#1297): `stadiums` (the ground, with an optional Wikidata item, place, coordinates, street and postcode), `stadium_names` (the names a ground has had, with a start as a season or a day) and `club_home_grounds` (the grounds a club played on, in order; sc Heerenveen has an empty `club_id`), and the column `matches.stadium_id`, empty until a stadium is certain. `matches.stadium` stays the text of the source. No row changes: the stadiums, the names and the links of the existing matches come from a step after the migrations (`seedStadiums`, `linkMatchesToStadiums`), which can run again.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so each CREATE TABLE gets it by hand.
-- To undo it on the host: `ALTER TABLE matches DROP FOREIGN KEY matches_stadium_id_stadiums_id_fk, DROP COLUMN stadium_id` and `DROP TABLE club_home_grounds, stadium_names, stadiums`; the editors' own work in these tables would be lost, so make a back-up first. `club_stadiums` is not touched.
CREATE TABLE IF NOT EXISTS `club_home_grounds` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`club_id` int unsigned,
	`stadium_id` int unsigned NOT NULL,
	`position` smallint unsigned NOT NULL,
	`start_season` varchar(7),
	`start_day` date,
	`note` varchar(200),
	CONSTRAINT `club_home_grounds_id` PRIMARY KEY(`id`),
	CONSTRAINT `club_home_grounds_club_id_position_unique` UNIQUE(`club_id`,`position`),
	CONSTRAINT `club_home_grounds_one_start` CHECK(`club_home_grounds`.`start_season` is null or `club_home_grounds`.`start_day` is null),
	CONSTRAINT `club_home_grounds_start_season_format` CHECK(`club_home_grounds`.`start_season` is null or `club_home_grounds`.`start_season` regexp '^[0-9]{4}/[0-9]{2}$'),
	CONSTRAINT `club_home_grounds_start_after_first` CHECK(`club_home_grounds`.`position` = 0 or `club_home_grounds`.`start_season` is not null or `club_home_grounds`.`start_day` is not null)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `stadium_names` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`stadium_id` int unsigned NOT NULL,
	`position` smallint unsigned NOT NULL,
	`name` varchar(100) NOT NULL,
	`start_season` varchar(7),
	`start_day` date,
	`note` varchar(200),
	CONSTRAINT `stadium_names_id` PRIMARY KEY(`id`),
	CONSTRAINT `stadium_names_stadium_id_position_unique` UNIQUE(`stadium_id`,`position`),
	CONSTRAINT `stadium_names_one_start` CHECK(`stadium_names`.`start_season` is null or `stadium_names`.`start_day` is null),
	CONSTRAINT `stadium_names_start_season_format` CHECK(`stadium_names`.`start_season` is null or `stadium_names`.`start_season` regexp '^[0-9]{4}/[0-9]{2}$'),
	CONSTRAINT `stadium_names_start_after_first` CHECK(`stadium_names`.`position` = 0 or `stadium_names`.`start_season` is not null or `stadium_names`.`start_day` is not null)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `stadiums` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`wikidata_id` varchar(20),
	`place` varchar(100),
	`latitude` decimal(9,6),
	`longitude` decimal(9,6),
	`place_source` enum('manual','wikidata'),
	`street` varchar(150),
	`postcode` varchar(12),
	CONSTRAINT `stadiums_id` PRIMARY KEY(`id`),
	CONSTRAINT `stadiums_wikidata_id_unique` UNIQUE(`wikidata_id`),
	CONSTRAINT `stadiums_coordinates_in_a_pair` CHECK((`stadiums`.`latitude` is null and `stadiums`.`longitude` is null) or (`stadiums`.`latitude` is not null and `stadiums`.`longitude` is not null))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `matches` ADD COLUMN IF NOT EXISTS `stadium_id` int unsigned;--> statement-breakpoint
ALTER TABLE `club_home_grounds` ADD CONSTRAINT `club_home_grounds_club_id_clubs_id_fk` FOREIGN KEY IF NOT EXISTS (`club_id`) REFERENCES `clubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `club_home_grounds` ADD CONSTRAINT `club_home_grounds_stadium_id_stadiums_id_fk` FOREIGN KEY IF NOT EXISTS (`stadium_id`) REFERENCES `stadiums`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stadium_names` ADD CONSTRAINT `stadium_names_stadium_id_stadiums_id_fk` FOREIGN KEY IF NOT EXISTS (`stadium_id`) REFERENCES `stadiums`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `club_home_grounds_stadium_id_idx` ON `club_home_grounds` (`stadium_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `stadium_names_name_idx` ON `stadium_names` (`name`);--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_stadium_id_stadiums_id_fk` FOREIGN KEY IF NOT EXISTS (`stadium_id`) REFERENCES `stadiums`(`id`) ON DELETE set null ON UPDATE no action;