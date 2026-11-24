-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
CREATE TABLE IF NOT EXISTS `visit_exclusions` (
	`day` date NOT NULL,
	`reason` enum('bot','geen-taal','niet-volgen','vooruitladen') NOT NULL,
	`requests` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `visit_exclusions_day_reason` PRIMARY KEY(`day`,`reason`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
