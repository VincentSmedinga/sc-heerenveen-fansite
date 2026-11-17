-- Adds `source_clubs` (#1367): the clubs that a regional source follows, such as N.E.C. for De Gelderlander. Of an article that two sources of one publisher have, the lists show the one of the regional source only when a headline of the article names one of these clubs. The table starts empty and the seed fills it from the register (`realSources`), so until then the regional source follows no club.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `DROP TABLE source_clubs`; the lists then show the other source of every article that two sources of one publisher have.
CREATE TABLE IF NOT EXISTS `source_clubs` (
	`source_id` int unsigned NOT NULL,
	`club` varchar(100) NOT NULL,
	CONSTRAINT `source_clubs_source_id_club_pk` PRIMARY KEY(`source_id`,`club`),
	CONSTRAINT `source_clubs_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE cascade ON UPDATE no action
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
