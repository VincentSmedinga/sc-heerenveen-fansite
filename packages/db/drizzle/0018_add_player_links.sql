-- Lets a goal point to the player of ours who scored it, and lets the squad be updated instead of replaced: a player gets the Wikipedia page he is known by and a mark for whether he is still in the squad.
-- A player that is there is in the squad, and has no page until the next import of the squad fills it. A goal that is there has no player until the next import of the matches links it.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `players` ADD COLUMN IF NOT EXISTS `wikipedia_page` varchar(255);
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN IF NOT EXISTS `in_squad` boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN IF NOT EXISTS `left_squad_at` datetime;
--> statement-breakpoint
ALTER TABLE `players` ADD UNIQUE INDEX IF NOT EXISTS `players_season_wikipedia_page_unique` (`season`,`wikipedia_page`);
--> statement-breakpoint
ALTER TABLE `players` ADD CONSTRAINT IF NOT EXISTS `players_left_squad_at_only_when_gone` CHECK (`players`.`in_squad` = 0 or `players`.`left_squad_at` is null);
--> statement-breakpoint
ALTER TABLE `match_goals` ADD COLUMN IF NOT EXISTS `player_id` int unsigned;
--> statement-breakpoint
ALTER TABLE `match_goals` ADD COLUMN IF NOT EXISTS `wikipedia_page` varchar(255);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `match_goals_player_id_idx` ON `match_goals` (`player_id`);
--> statement-breakpoint
ALTER TABLE `match_goals` ADD FOREIGN KEY IF NOT EXISTS `match_goals_player_id_players_id_fk` (`player_id`) REFERENCES `players`(`id`) ON DELETE set null ON UPDATE no action;
