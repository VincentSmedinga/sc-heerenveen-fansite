-- Keeps a difference between the goals of a player in the squad table and the goals counted from the matches or the match reports, so the editors see it until they decide (issue 974): the table `player_stat_differences`.
-- `player_season_stats.table_goals` keeps the goals the table of Wikipedia had when the editors took another number over, so the importer leaves their number alone while the table says the same.
-- The log of the admin gets `player.stats-take-over` and `player.stats-keep`, the decision about such a difference.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `DROP TABLE player_stat_differences`, `ALTER TABLE player_season_stats DROP COLUMN table_goals`, and put the list of actions back as it was after removing the rows with the two new actions.
CREATE TABLE IF NOT EXISTS `player_stat_differences` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`player_id` int unsigned NOT NULL,
	`season` varchar(7) NOT NULL,
	`competition` enum('Eredivisie','KNVB Beker') NOT NULL,
	`compared_with` enum('matches','reports') NOT NULL,
	`table_goals` int unsigned NOT NULL,
	`other_goals` int unsigned NOT NULL,
	`status` enum('pending','accepted','rejected') NOT NULL,
	`resolution` enum('person','reverted','replaced'),
	`first_seen_at` datetime NOT NULL,
	`last_seen_at` datetime NOT NULL,
	`decided_at` datetime,
	CONSTRAINT `player_stat_differences_id` PRIMARY KEY(`id`),
	CONSTRAINT `player_stat_differences_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action,
	INDEX `player_stat_differences_season_status_idx` (`season`,`status`),
	INDEX `player_stat_differences_player_idx` (`player_id`)
);
--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `action` enum('item.hide','item.show','item.approve','item.unapprove','article.create','article.update','article.publish','article.unpublish','match.edit','match.undo','match.caught-up','match.differs','match.take-over','match.keep','match.add','match.delete','stadium.save','stadium.reset','club-name.save','club-name.reset','player.stats-differ','player.stats-take-over','player.stats-keep') NOT NULL;--> statement-breakpoint
ALTER TABLE `player_season_stats` ADD COLUMN IF NOT EXISTS `table_goals` int unsigned;
