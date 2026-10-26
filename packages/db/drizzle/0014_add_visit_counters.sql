-- Creates the tables that count the visits: the page views and the visitors per day, and the salt and hashes of the day that are removed once the day is over.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so each CREATE TABLE gets it by hand.
CREATE TABLE IF NOT EXISTS `daily_visitors` (
	`day` date NOT NULL,
	`visitors` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `daily_visitors_day` PRIMARY KEY(`day`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `page_views` (
	`day` date NOT NULL,
	`path` varchar(100) NOT NULL,
	`views` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `page_views_day_path` PRIMARY KEY(`day`,`path`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `visitor_hashes` (
	`day` date NOT NULL,
	`hash` char(64) NOT NULL,
	CONSTRAINT `visitor_hashes_day_hash` PRIMARY KEY(`day`,`hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `visitor_salts` (
	`day` date NOT NULL,
	`salt` char(64) NOT NULL,
	CONSTRAINT `visitor_salts_day` PRIMARY KEY(`day`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
