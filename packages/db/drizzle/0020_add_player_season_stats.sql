-- Creates the table of the numbers of a player in a competition of a season (appearances, goals and assists), from the squad table on the Dutch Wikipedia, one row per player, season and competition.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE statement gets it by hand.
CREATE TABLE IF NOT EXISTS `player_season_stats` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`player_id` int unsigned NOT NULL,
	`season` varchar(7) NOT NULL,
	`competition` enum('Eredivisie','KNVB Beker') NOT NULL,
	`appearances` int unsigned NOT NULL,
	`goals` int unsigned NOT NULL,
	`assists` int unsigned NOT NULL,
	`updated_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	CONSTRAINT `player_season_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `player_season_stats_player_season_competition_unique` UNIQUE(`player_id`,`season`,`competition`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `player_season_stats` ADD FOREIGN KEY IF NOT EXISTS `player_season_stats_player_id_players_id_fk` (`player_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `player_season_stats_season_idx` ON `player_season_stats` (`season`);
