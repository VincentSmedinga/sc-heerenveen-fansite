-- Makes the table for the kicks of a penalty shoot-out in a match report: the team, the round, the player and what came of the kick (#844). The table starts empty, and nothing reads it yet.
-- The migration only adds. To undo it on the host, drop the table: `DROP TABLE match_shootout_kicks`. Only the kicks are lost; the result of the series stays in `penalties_for` and `penalties_against` of the match. The rows of the table are the work of the editors, so the backup takes them along.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand, and the keys and the check are in the CREATE TABLE so a second run does nothing.
CREATE TABLE IF NOT EXISTS `match_shootout_kicks` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`match_id` int unsigned NOT NULL,
	`ours` boolean NOT NULL,
	`round` int unsigned NOT NULL,
	`appearance_id` int unsigned,
	`outcome` enum('raak','naast','gestopt') NOT NULL,
	CONSTRAINT `match_shootout_kicks_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_shootout_kicks_match_side_round_unique` UNIQUE(`match_id`,`ours`,`round`),
	CONSTRAINT `match_shootout_kicks_round_range` CHECK(`match_shootout_kicks`.`round` between 1 and 50),
	CONSTRAINT `match_shootout_kicks_match_id_match_reports_match_id_fk` FOREIGN KEY (`match_id`) REFERENCES `match_reports`(`match_id`) ON DELETE cascade ON UPDATE no action,
	CONSTRAINT `match_shootout_kicks_appearance_fk` FOREIGN KEY (`appearance_id`,`match_id`,`ours`) REFERENCES `match_appearances`(`id`,`match_id`,`ours`) ON DELETE cascade ON UPDATE no action,
	INDEX `match_shootout_kicks_appearance_id_idx` (`appearance_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
