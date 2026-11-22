-- Adds `fantasy_picks` and `fantasy_player_lines` for #1469: the four players a supporter chooses for a match in the game Fjouwer, and the line a player has in the game, kept at his first use in a season. No row is written.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so each CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE fantasy_picks, fantasy_player_lines`; only the chosen fours are lost.
CREATE TABLE IF NOT EXISTS `fantasy_picks` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`supporter_id` int unsigned,
	`match_id` int unsigned NOT NULL,
	`player_1_id` int unsigned NOT NULL,
	`player_2_id` int unsigned NOT NULL,
	`player_3_id` int unsigned NOT NULL,
	`player_4_id` int unsigned NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	`updated_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	CONSTRAINT `fantasy_picks_id` PRIMARY KEY(`id`),
	CONSTRAINT `fantasy_picks_supporter_id_match_id_unique` UNIQUE(`supporter_id`,`match_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `fantasy_player_lines` (
	`player_id` int unsigned NOT NULL,
	`line` enum('doelman','verdediger','middenvelder','aanvaller') NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	CONSTRAINT `fantasy_player_lines_player_id` PRIMARY KEY(`player_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `fantasy_picks` ADD CONSTRAINT `fantasy_picks_supporter_id_supporters_id_fk` FOREIGN KEY IF NOT EXISTS (`supporter_id`) REFERENCES `supporters`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_picks` ADD CONSTRAINT `fantasy_picks_match_id_matches_id_fk` FOREIGN KEY IF NOT EXISTS (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_picks` ADD CONSTRAINT `fantasy_picks_player_1_id_players_id_fk` FOREIGN KEY IF NOT EXISTS (`player_1_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_picks` ADD CONSTRAINT `fantasy_picks_player_2_id_players_id_fk` FOREIGN KEY IF NOT EXISTS (`player_2_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_picks` ADD CONSTRAINT `fantasy_picks_player_3_id_players_id_fk` FOREIGN KEY IF NOT EXISTS (`player_3_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_picks` ADD CONSTRAINT `fantasy_picks_player_4_id_players_id_fk` FOREIGN KEY IF NOT EXISTS (`player_4_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_player_lines` ADD CONSTRAINT `fantasy_player_lines_player_id_players_id_fk` FOREIGN KEY IF NOT EXISTS (`player_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `fantasy_picks_match_id_idx` ON `fantasy_picks` (`match_id`);