-- Makes the tables for a match report: who played, who came on, the cards, the missed penalties, and the assists (#828). Adds the player and the assist to a goal, and the source `verslag` to a player. The tables start empty, and the new columns of `match_goals` are empty: nothing reads them yet.
-- The migration only adds, and widens the lists of sources. To undo it on the host, drop the two foreign keys, the two indexes and the two columns of `match_goals`, then the tables `match_incidents`, `match_cards`, `match_substitutions`, `match_appearances` and `match_reports`, in that order. To take `verslag` out of the lists, first check that no row has it (`SELECT COUNT(*) FROM players WHERE source = 'verslag'`), and only then run `ALTER TABLE players MODIFY COLUMN source enum('selectie','statistieken','engels','transfers','doelpunten','wikidata') NOT NULL DEFAULT 'selectie'`, and the same for `best_source` of `squad_completeness`, without the default. The rows of the tables are the work of the editors, so the backup takes them along.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLEs get it by hand, and the keys and checks are in the CREATE TABLE so a second run does nothing.
CREATE TABLE IF NOT EXISTS `match_reports` (
	`match_id` int unsigned NOT NULL,
	`status` enum('bezig','klaar') NOT NULL,
	`opponent_complete` boolean NOT NULL DEFAULT false,
	`source` varchar(100),
	`saved_by` int unsigned,
	`saved_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	CONSTRAINT `match_reports_match_id` PRIMARY KEY(`match_id`),
	CONSTRAINT `match_reports_source_not_empty` CHECK(`match_reports`.`source` is null or char_length(`match_reports`.`source`) > 0),
	CONSTRAINT `match_reports_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action,
	CONSTRAINT `match_reports_saved_by_admin_users_id_fk` FOREIGN KEY (`saved_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `match_appearances` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`match_id` int unsigned NOT NULL,
	`ours` boolean NOT NULL,
	`player_id` int unsigned,
	`name` varchar(100) NOT NULL,
	`shirt_number` int unsigned NOT NULL,
	`starter` boolean NOT NULL,
	`captain` boolean NOT NULL DEFAULT false,
	CONSTRAINT `match_appearances_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_appearances_match_side_shirt_number_unique` UNIQUE(`match_id`,`ours`,`shirt_number`),
	CONSTRAINT `match_appearances_match_player_unique` UNIQUE(`match_id`,`player_id`),
	CONSTRAINT `match_appearances_id_match_side_unique` UNIQUE(`id`,`match_id`,`ours`),
	CONSTRAINT `match_appearances_name_not_empty` CHECK(char_length(`match_appearances`.`name`) > 0),
	CONSTRAINT `match_appearances_shirt_number_range` CHECK(`match_appearances`.`shirt_number` between 1 and 99),
	CONSTRAINT `match_appearances_match_id_match_reports_match_id_fk` FOREIGN KEY (`match_id`) REFERENCES `match_reports`(`match_id`) ON DELETE cascade ON UPDATE no action,
	CONSTRAINT `match_appearances_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE set null ON UPDATE no action,
	INDEX `match_appearances_player_id_idx` (`player_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `match_substitutions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`match_id` int unsigned NOT NULL,
	`ours` boolean NOT NULL,
	`appearance_out_id` int unsigned NOT NULL,
	`appearance_in_id` int unsigned NOT NULL,
	`minute` int unsigned NOT NULL,
	`stoppage_minutes` int unsigned,
	CONSTRAINT `match_substitutions_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_substitutions_out_unique` UNIQUE(`appearance_out_id`),
	CONSTRAINT `match_substitutions_in_unique` UNIQUE(`appearance_in_id`),
	CONSTRAINT `match_substitutions_two_players` CHECK(`match_substitutions`.`appearance_out_id` <> `match_substitutions`.`appearance_in_id`),
	CONSTRAINT `match_substitutions_minute_range` CHECK(`match_substitutions`.`minute` between 1 and 120),
	CONSTRAINT `match_substitutions_stoppage_range` CHECK(`match_substitutions`.`stoppage_minutes` is null or (`match_substitutions`.`stoppage_minutes` between 1 and 15 and `match_substitutions`.`minute` in (45, 90, 105, 120))),
	CONSTRAINT `match_substitutions_out_appearance_fk` FOREIGN KEY (`appearance_out_id`,`match_id`,`ours`) REFERENCES `match_appearances`(`id`,`match_id`,`ours`) ON DELETE cascade ON UPDATE no action,
	CONSTRAINT `match_substitutions_in_appearance_fk` FOREIGN KEY (`appearance_in_id`,`match_id`,`ours`) REFERENCES `match_appearances`(`id`,`match_id`,`ours`) ON DELETE cascade ON UPDATE no action,
	INDEX `match_substitutions_match_id_idx` (`match_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `match_cards` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`match_id` int unsigned NOT NULL,
	`ours` boolean NOT NULL,
	`appearance_id` int unsigned NOT NULL,
	`kind` enum('geel','geel-rood','rood') NOT NULL,
	`minute` int unsigned NOT NULL,
	`stoppage_minutes` int unsigned,
	CONSTRAINT `match_cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_cards_appearance_kind_unique` UNIQUE(`appearance_id`,`kind`),
	CONSTRAINT `match_cards_minute_range` CHECK(`match_cards`.`minute` between 1 and 120),
	CONSTRAINT `match_cards_stoppage_range` CHECK(`match_cards`.`stoppage_minutes` is null or (`match_cards`.`stoppage_minutes` between 1 and 15 and `match_cards`.`minute` in (45, 90, 105, 120))),
	CONSTRAINT `match_cards_appearance_fk` FOREIGN KEY (`appearance_id`,`match_id`,`ours`) REFERENCES `match_appearances`(`id`,`match_id`,`ours`) ON DELETE cascade ON UPDATE no action,
	INDEX `match_cards_match_id_idx` (`match_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `match_incidents` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`match_id` int unsigned NOT NULL,
	`ours` boolean NOT NULL,
	`appearance_id` int unsigned NOT NULL,
	`kind` enum('strafschop-gemist','strafschop-gestopt') NOT NULL,
	`minute` int unsigned NOT NULL,
	`stoppage_minutes` int unsigned,
	CONSTRAINT `match_incidents_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_incidents_minute_range` CHECK(`match_incidents`.`minute` between 1 and 120),
	CONSTRAINT `match_incidents_stoppage_range` CHECK(`match_incidents`.`stoppage_minutes` is null or (`match_incidents`.`stoppage_minutes` between 1 and 15 and `match_incidents`.`minute` in (45, 90, 105, 120))),
	CONSTRAINT `match_incidents_appearance_fk` FOREIGN KEY (`appearance_id`,`match_id`,`ours`) REFERENCES `match_appearances`(`id`,`match_id`,`ours`) ON DELETE cascade ON UPDATE no action,
	INDEX `match_incidents_match_id_idx` (`match_id`),
	INDEX `match_incidents_appearance_id_idx` (`appearance_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `players` MODIFY COLUMN `source` enum('selectie','statistieken','engels','transfers','doelpunten','wikidata','verslag') NOT NULL DEFAULT 'selectie';
--> statement-breakpoint
ALTER TABLE `squad_completeness` MODIFY COLUMN `best_source` enum('selectie','statistieken','engels','transfers','doelpunten','wikidata','verslag') NOT NULL;
--> statement-breakpoint
ALTER TABLE `match_goals` ADD COLUMN IF NOT EXISTS `appearance_id` int unsigned;
--> statement-breakpoint
ALTER TABLE `match_goals` ADD COLUMN IF NOT EXISTS `assist_appearance_id` int unsigned;
--> statement-breakpoint
ALTER TABLE `match_goals` ADD FOREIGN KEY IF NOT EXISTS `match_goals_appearance_id_match_appearances_id_fk` (`appearance_id`) REFERENCES `match_appearances`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `match_goals` ADD FOREIGN KEY IF NOT EXISTS `match_goals_assist_appearance_id_match_appearances_id_fk` (`assist_appearance_id`) REFERENCES `match_appearances`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `match_goals` ADD INDEX IF NOT EXISTS `match_goals_appearance_id_idx` (`appearance_id`);
--> statement-breakpoint
ALTER TABLE `match_goals` ADD INDEX IF NOT EXISTS `match_goals_assist_appearance_id_idx` (`assist_appearance_id`);
