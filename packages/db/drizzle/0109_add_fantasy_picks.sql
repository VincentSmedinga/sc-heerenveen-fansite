CREATE TABLE `fantasy_picks` (
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
);
--> statement-breakpoint
CREATE TABLE `fantasy_player_lines` (
	`player_id` int unsigned NOT NULL,
	`line` enum('doelman','verdediger','middenvelder','aanvaller') NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	CONSTRAINT `fantasy_player_lines_player_id` PRIMARY KEY(`player_id`)
);
--> statement-breakpoint
ALTER TABLE `fantasy_picks` ADD CONSTRAINT `fantasy_picks_supporter_id_supporters_id_fk` FOREIGN KEY (`supporter_id`) REFERENCES `supporters`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_picks` ADD CONSTRAINT `fantasy_picks_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_picks` ADD CONSTRAINT `fantasy_picks_player_1_id_players_id_fk` FOREIGN KEY (`player_1_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_picks` ADD CONSTRAINT `fantasy_picks_player_2_id_players_id_fk` FOREIGN KEY (`player_2_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_picks` ADD CONSTRAINT `fantasy_picks_player_3_id_players_id_fk` FOREIGN KEY (`player_3_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_picks` ADD CONSTRAINT `fantasy_picks_player_4_id_players_id_fk` FOREIGN KEY (`player_4_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_player_lines` ADD CONSTRAINT `fantasy_player_lines_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `fantasy_picks_match_id_idx` ON `fantasy_picks` (`match_id`);