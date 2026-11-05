-- Makes the tables with the persons who scored a goal or stood in a squad, and the titles of the Wikipedia articles that lead to them, so the importer asks Wikipedia once whether a title is a redirect and remembers the answer. Lets a goal and a player of the squad point to their person. Both tables start empty and the new columns are empty: the importer fills them at its next run.
-- The migration only adds. To undo it on the host, drop the three foreign keys and the two columns, then the two tables; no other data is lost.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
CREATE TABLE IF NOT EXISTS `persons` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`wikipedia_page` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
	CONSTRAINT `persons_id` PRIMARY KEY(`id`),
	CONSTRAINT `persons_wikipedia_page_unique` UNIQUE(`wikipedia_page`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `person_pages` (
	`page` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
	`person_id` int unsigned NOT NULL,
	CONSTRAINT `person_pages_page` PRIMARY KEY(`page`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `person_pages` ADD FOREIGN KEY IF NOT EXISTS `person_pages_person_id_persons_id_fk` (`person_id`) REFERENCES `persons`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `match_goals` ADD COLUMN IF NOT EXISTS `person_id` int unsigned;
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN IF NOT EXISTS `person_id` int unsigned;
--> statement-breakpoint
ALTER TABLE `match_goals` ADD FOREIGN KEY IF NOT EXISTS `match_goals_person_id_persons_id_fk` (`person_id`) REFERENCES `persons`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `players` ADD FOREIGN KEY IF NOT EXISTS `players_person_id_persons_id_fk` (`person_id`) REFERENCES `persons`(`id`) ON DELETE set null ON UPDATE no action;
