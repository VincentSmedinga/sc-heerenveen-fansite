-- Creates the tables of the clubs sc Heerenveen played against, and gives every match a club. A club is one article on the Dutch Wikipedia; its slug is the fixed name in an address.
-- The clubs come from the distinct values of `matches.opponent`, with a slug of the name without dots and apostrophes (`-2` behind it when the slug is taken, and for `kies`, which the pages of the site use). The importer adds the article of a club the next time it reads a season.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so each CREATE TABLE statement gets it by hand.
CREATE TABLE IF NOT EXISTS `clubs` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`name` varchar(100) NOT NULL,
	`wikipedia_page` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
	`created_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	CONSTRAINT `clubs_id` PRIMARY KEY(`id`),
	CONSTRAINT `clubs_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `clubs_wikipedia_page_unique` UNIQUE(`wikipedia_page`),
	CONSTRAINT `clubs_slug_format` CHECK(`clubs`.`slug` regexp '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$')
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `club_names` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`club_id` int unsigned NOT NULL,
	`name` varchar(100) NOT NULL,
	CONSTRAINT `club_names_id` PRIMARY KEY(`id`),
	CONSTRAINT `club_names_name_unique` UNIQUE(`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `club_names` ADD FOREIGN KEY IF NOT EXISTS `club_names_club_id_clubs_id_fk` (`club_id`) REFERENCES `clubs`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `matches` ADD COLUMN IF NOT EXISTS `club_id` int unsigned;
--> statement-breakpoint
INSERT INTO `clubs` (`slug`, `name`)
SELECT
	CASE WHEN `rn` = 1 AND `base` <> 'kies' THEN `base` ELSE CONCAT(`base`, '-', GREATEST(`rn`, 2)) END,
	`name`
FROM (
	SELECT `name`, `base`, ROW_NUMBER() OVER (PARTITION BY `base` ORDER BY `name`) AS `rn`
	FROM (
		SELECT `opponent` AS `name`,
			COALESCE(NULLIF(TRIM(BOTH '-' FROM LEFT(TRIM(BOTH '-' FROM REGEXP_REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(`opponent`), '.', ''), '''', ''), '’', ''), 'à', 'a'), 'á', 'a'), 'â', 'a'), 'ã', 'a'), 'ä', 'a'), 'å', 'a'), 'ç', 'c'), 'è', 'e'), 'é', 'e'), 'ê', 'e'), 'ë', 'e'), 'ì', 'i'), 'í', 'i'), 'î', 'i'), 'ï', 'i'), 'ñ', 'n'), 'ò', 'o'), 'ó', 'o'), 'ô', 'o'), 'õ', 'o'), 'ö', 'o'), 'ø', 'o'), 'ù', 'u'), 'ú', 'u'), 'û', 'u'), 'ü', 'u'), 'ý', 'y'), 'ÿ', 'y'), 'ß', 'ss'), 'æ', 'ae'), 'œ', 'oe'), '(?-i)[^a-z0-9]+', '-')), 70)), ''), 'club') AS `base`
		FROM (SELECT DISTINCT `opponent` FROM `matches`) AS `opponents`
	) AS `named`
) AS `numbered`
WHERE NOT EXISTS (SELECT 1 FROM `clubs` WHERE `clubs`.`name` = `numbered`.`name`)
ORDER BY `numbered`.`name`;
--> statement-breakpoint
UPDATE `matches` JOIN `clubs` ON `clubs`.`name` = `matches`.`opponent` SET `matches`.`club_id` = `clubs`.`id` WHERE `matches`.`club_id` IS NULL;
--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `club_id` int unsigned NOT NULL;
--> statement-breakpoint
ALTER TABLE `matches` ADD FOREIGN KEY IF NOT EXISTS `matches_club_id_clubs_id_fk` (`club_id`) REFERENCES `clubs`(`id`) ON DELETE no action ON UPDATE no action;
