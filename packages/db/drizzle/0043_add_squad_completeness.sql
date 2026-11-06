-- Stores the chance that the list of players of a season holds the whole squad, worked out by the importer (#746).
-- The migration only adds a table. To undo it on the host, drop the table (`DROP TABLE squad_completeness`): it holds only what the importer works out again from `players` and `match_goals` with `import:completeness`, so no data is lost.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
CREATE TABLE IF NOT EXISTS `squad_completeness` (
	`season` varchar(7) NOT NULL,
	`probability` smallint unsigned NOT NULL,
	`level` enum('onbekend','weinig','deels','bijna','compleet') NOT NULL,
	`player_count` int unsigned NOT NULL,
	`best_source` enum('selectie','statistieken','engels','transfers','doelpunten','wikidata') NOT NULL,
	`matches_total` int unsigned,
	`goals_total` int unsigned,
	`checks` json NOT NULL,
	`calculated_at` datetime NOT NULL,
	CONSTRAINT `squad_completeness_season` PRIMARY KEY(`season`),
	CONSTRAINT `squad_completeness_probability_range` CHECK(`squad_completeness`.`probability` between 0 and 100)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
