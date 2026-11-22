-- Adds `match_player_ratings`, `old_season_ratings` and `old_season_winners` for #1465: the averages of the ratings that supporters gave our players, and the season ratings of 1998/99 to 2000/01. No row is written; the import of the old fansite fills them.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so each CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE match_player_ratings, old_season_ratings, old_season_winners`; only the ratings are lost.
CREATE TABLE IF NOT EXISTS `match_player_ratings` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`match_id` int unsigned NOT NULL,
	`player_id` int unsigned NOT NULL,
	`source` enum('oude-fansite','fans') NOT NULL,
	`average` decimal(4,2) NOT NULL,
	`rating_count` int unsigned NOT NULL,
	`spread` decimal(4,2) NOT NULL,
	CONSTRAINT `match_player_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_player_ratings_match_player_source_unique` UNIQUE(`match_id`,`player_id`,`source`),
	CONSTRAINT `match_player_ratings_count_positive` CHECK(`match_player_ratings`.`rating_count` > 0),
	CONSTRAINT `match_player_ratings_average_in_range` CHECK(`match_player_ratings`.`average` between 1 and 10)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `old_season_ratings` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`season` varchar(7) NOT NULL,
	`player_id` int unsigned,
	`name` varchar(100) NOT NULL,
	`average` decimal(4,2) NOT NULL,
	CONSTRAINT `old_season_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `old_season_ratings_season_name_unique` UNIQUE(`season`,`name`),
	CONSTRAINT `old_season_ratings_average_in_range` CHECK(`old_season_ratings`.`average` between 1 and 10)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `old_season_winners` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`season` varchar(7) NOT NULL,
	`player_id` int unsigned,
	`name` varchar(100) NOT NULL,
	CONSTRAINT `old_season_winners_id` PRIMARY KEY(`id`),
	CONSTRAINT `old_season_winners_season_unique` UNIQUE(`season`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `match_player_ratings` ADD CONSTRAINT `match_player_ratings_match_id_matches_id_fk` FOREIGN KEY IF NOT EXISTS (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `match_player_ratings` ADD CONSTRAINT `match_player_ratings_player_id_players_id_fk` FOREIGN KEY IF NOT EXISTS (`player_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `old_season_ratings` ADD CONSTRAINT `old_season_ratings_player_id_players_id_fk` FOREIGN KEY IF NOT EXISTS (`player_id`) REFERENCES `players`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `old_season_winners` ADD CONSTRAINT `old_season_winners_player_id_players_id_fk` FOREIGN KEY IF NOT EXISTS (`player_id`) REFERENCES `players`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `match_player_ratings_player_id_idx` ON `match_player_ratings` (`player_id`);
