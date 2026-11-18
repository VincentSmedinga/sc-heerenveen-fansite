-- Adds `group_standings` (#1405): the table of the group of a European tournament, such as the Champions League of 2000/01, read from the Dutch Wikipedia. The table starts empty and the import of a season with a group stage fills it, so until then a competition card has no table.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `DROP TABLE group_standings`; the cards then show the matches without a table.
CREATE TABLE IF NOT EXISTS `group_standings` (
	`season` varchar(7) NOT NULL,
	`competition` enum('Eredivisie','KNVB Beker','Play-offs Conference League','Europa League','Play-offs Europa League','Eerste divisie','Champions League','Europacup II','UEFA Cup','Intertoto Cup','Play-offs UEFA Cup','Johan Cruijff Schaal','Play-offs Champions League') NOT NULL,
	`group_name` varchar(40) NOT NULL,
	`position` int unsigned NOT NULL,
	`club_id` int unsigned,
	`played` int unsigned NOT NULL,
	`won` int unsigned NOT NULL,
	`drawn` int unsigned NOT NULL,
	`lost` int unsigned NOT NULL,
	`goals_for` int unsigned NOT NULL,
	`goals_against` int unsigned NOT NULL,
	`goal_difference` int NOT NULL,
	`points` int unsigned NOT NULL,
	`source_page` varchar(255) NOT NULL,
	`language` char(2) NOT NULL,
	`read_at` datetime NOT NULL,
	CONSTRAINT `group_standings_pk` PRIMARY KEY(`season`,`competition`,`group_name`,`position`),
	CONSTRAINT `group_standings_club_unique` UNIQUE(`season`,`competition`,`group_name`,`club_id`),
	CONSTRAINT `group_standings_club_id_clubs_id_fk` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE cascade ON UPDATE no action
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;