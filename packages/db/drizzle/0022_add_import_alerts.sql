-- Creates the table in which the importer keeps what it needs to mail about an import that fails again and again: the failed runs in a row, since when, and when the last mail went out.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE statement gets it by hand.
CREATE TABLE IF NOT EXISTS `import_alerts` (
	`subject` varchar(100) NOT NULL,
	`failing_since` datetime NOT NULL,
	`failures_in_a_row` int unsigned NOT NULL DEFAULT 0,
	`last_error` varchar(300),
	`mailed_at` datetime,
	CONSTRAINT `import_alerts_subject` PRIMARY KEY(`subject`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
