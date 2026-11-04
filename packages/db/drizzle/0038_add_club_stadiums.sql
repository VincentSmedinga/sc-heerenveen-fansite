-- Makes a table with the names of the stadium of a club, as the editors keep them in the admin, each with its start (a season or a day) and a short note for the card on the page of the club. The table starts empty: the editors fill in the clubs that need it, and a club without rows keeps showing what the matches say.
-- Lets the log of the admin take the two actions on such a list: saving it and going back to Wikipedia.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
CREATE TABLE IF NOT EXISTS `club_stadiums` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`club_id` int unsigned NOT NULL,
	`position` smallint unsigned NOT NULL,
	`name` varchar(100) NOT NULL,
	`start_season` varchar(7),
	`start_day` date,
	`note` varchar(200),
	CONSTRAINT `club_stadiums_id` PRIMARY KEY(`id`),
	CONSTRAINT `club_stadiums_club_id_position_unique` UNIQUE(`club_id`,`position`),
	CONSTRAINT `club_stadiums_one_start` CHECK(`club_stadiums`.`start_season` is null or `club_stadiums`.`start_day` is null),
	CONSTRAINT `club_stadiums_start_season_format` CHECK(`club_stadiums`.`start_season` is null or `club_stadiums`.`start_season` regexp '^[0-9]{4}/[0-9]{2}$'),
	CONSTRAINT `club_stadiums_start_after_first` CHECK(`club_stadiums`.`position` = 0 or `club_stadiums`.`start_season` is not null or `club_stadiums`.`start_day` is not null),
	CONSTRAINT `club_stadiums_club_id_clubs_id_fk` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE cascade ON UPDATE no action
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `action` enum('item.hide','item.show','article.create','article.update','article.publish','article.unpublish','match.edit','match.undo','match.caught-up','match.differs','match.take-over','match.keep','stadium.save','stadium.reset') NOT NULL;
