-- Lets the database keep the matches of the old fansite, 1990 to 2007 (#873): six new competitions, the source of each match (`wikipedia` or `oude-fansite`), a match with a date and no time, and the table `match_statistics` for corners, offsides and fouls. Every existing match gets the source `wikipedia`. Nothing reads the new table yet, and the importer only starts to write matches of the old fansite in a later issue.
-- The migration only adds, and widens the list of competitions and the two checks. To undo it on the host, first check that no match uses them (`SELECT COUNT(*) FROM matches WHERE data_source = 'oude-fansite' OR competition NOT IN ('Eredivisie','KNVB Beker','Play-offs Conference League','Europa League','Play-offs Europa League')`, and the same for `match_changes`), and only then: `DROP TABLE match_statistics`, drop the two checks, `ALTER TABLE matches DROP COLUMN data_source`, put the old five-value `enum` back on `competition` of `matches` and `match_changes`, and add the old checks again (see `0012` and `0035`). The matches of the old fansite are the work of an import that can run again, but the statistics are not kept anywhere else, so the backup takes them along.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand, and the key is in the CREATE TABLE so a second run does nothing.
ALTER TABLE `matches` DROP CONSTRAINT IF EXISTS `matches_time_or_text`;--> statement-breakpoint
ALTER TABLE `matches` DROP CONSTRAINT IF EXISTS `matches_extra_time_only_in_played_knockout`;--> statement-breakpoint
ALTER TABLE `match_changes` MODIFY COLUMN `competition` enum('Eredivisie','KNVB Beker','Play-offs Conference League','Europa League','Play-offs Europa League','Eerste divisie','Champions League','Europacup II','UEFA Cup','Intertoto Cup','Play-offs UEFA Cup') NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `competition` enum('Eredivisie','KNVB Beker','Play-offs Conference League','Europa League','Play-offs Europa League','Eerste divisie','Champions League','Europacup II','UEFA Cup','Intertoto Cup','Play-offs UEFA Cup') NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD COLUMN IF NOT EXISTS `data_source` enum('wikipedia','oude-fansite') DEFAULT 'wikipedia' NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT IF NOT EXISTS `matches_time_or_text` CHECK (`matches`.`data_source` = 'oude-fansite' or `matches`.`kickoff_at` is not null or `matches`.`date_text` is not null);--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT IF NOT EXISTS `matches_extra_time_only_in_played_knockout` CHECK (`matches`.`extra_time` = 0 or (`matches`.`status` = 'played' and `matches`.`competition` not in ('Eredivisie', 'Eerste divisie')));--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `match_statistics` (
	`match_id` int unsigned NOT NULL,
	`corners_for` int unsigned NOT NULL,
	`corners_against` int unsigned NOT NULL,
	`offsides_for` int unsigned NOT NULL,
	`offsides_against` int unsigned NOT NULL,
	`fouls_for` int unsigned NOT NULL,
	`fouls_against` int unsigned NOT NULL,
	CONSTRAINT `match_statistics_match_id` PRIMARY KEY(`match_id`),
	CONSTRAINT `match_statistics_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
