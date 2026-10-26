-- Creates the table of the goals of a played match, with the minute and the scorer. The rows go with their match.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
CREATE TABLE IF NOT EXISTS `match_goals` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`match_id` int unsigned NOT NULL,
	`ours` boolean NOT NULL,
	`minute` int unsigned NOT NULL,
	`stoppage_minutes` int unsigned,
	`player` varchar(100) NOT NULL,
	`own_goal` boolean NOT NULL DEFAULT false,
	`penalty` boolean NOT NULL DEFAULT false,
	CONSTRAINT `match_goals_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_goals_not_own_goal_and_penalty` CHECK(`match_goals`.`own_goal` = 0 or `match_goals`.`penalty` = 0),
	CONSTRAINT `match_goals_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action,
	INDEX `match_goals_match_id_idx` (`match_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
