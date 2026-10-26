-- Creates the tables of the squad: the players of the season and the health of the squad import, and lets a Wikipedia page be the squad page.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE statements get it by hand.
CREATE TABLE IF NOT EXISTS `players` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`season` varchar(7) NOT NULL,
	`name` varchar(100) NOT NULL,
	`position` enum('doelman','verdediger','middenvelder','aanvaller') NOT NULL,
	`shirt_number` int unsigned,
	`search_term` varchar(100) NOT NULL,
	CONSTRAINT `players_id` PRIMARY KEY(`id`),
	CONSTRAINT `players_season_name_unique` UNIQUE(`season`,`name`),
	CONSTRAINT `players_shirt_number_range` CHECK(`players`.`shirt_number` is null or `players`.`shirt_number` between 1 and 99)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `squad_imports` (
	`season` varchar(7) NOT NULL,
	`last_success_at` datetime,
	`last_outcome` enum('imported','error','blocked-by-robots','wait') NOT NULL,
	`failures_in_a_row` int unsigned NOT NULL DEFAULT 0,
	`last_error` varchar(300),
	`last_error_at` datetime,
	`last_warning` varchar(300),
	`last_warning_at` datetime,
	`retry_at` datetime,
	CONSTRAINT `squad_imports_season` PRIMARY KEY(`season`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `wikipedia_pages` MODIFY COLUMN `kind` enum('standings','programme','cup','squad') NOT NULL;
