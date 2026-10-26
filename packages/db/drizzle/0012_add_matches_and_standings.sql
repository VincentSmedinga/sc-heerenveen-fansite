-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so each CREATE TABLE gets it by hand.
CREATE TABLE `match_imports` (
	`season` varchar(7) NOT NULL,
	`last_success_at` datetime,
	`last_outcome` enum('imported','error','blocked-by-robots','wait') NOT NULL,
	`failures_in_a_row` int unsigned NOT NULL DEFAULT 0,
	`last_error` varchar(300),
	`last_error_at` datetime,
	`last_warning` varchar(300),
	`last_warning_at` datetime,
	`retry_at` datetime,
	CONSTRAINT `match_imports_season` PRIMARY KEY(`season`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`season` varchar(7) NOT NULL,
	`competition` enum('Eredivisie','KNVB Beker') NOT NULL,
	`round` varchar(60) NOT NULL,
	`opponent` varchar(100) NOT NULL,
	`home` boolean NOT NULL,
	`stadium` varchar(150),
	`status` enum('scheduled','played','postponed') NOT NULL,
	`goals_for` int unsigned,
	`goals_against` int unsigned,
	`match_date` date NOT NULL,
	`kickoff_at` datetime,
	`date_text` varchar(60),
	`result_set_at` datetime,
	CONSTRAINT `matches_id` PRIMARY KEY(`id`),
	CONSTRAINT `matches_season_competition_round_unique` UNIQUE(`season`,`competition`,`round`),
	CONSTRAINT `matches_result_only_when_played` CHECK((`matches`.`status` = 'played' and `matches`.`goals_for` is not null and `matches`.`goals_against` is not null) or (`matches`.`status` <> 'played' and `matches`.`goals_for` is null and `matches`.`goals_against` is null)),
	CONSTRAINT `matches_time_or_text` CHECK(`matches`.`kickoff_at` is not null or `matches`.`date_text` is not null)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `standings` (
	`season` varchar(7) NOT NULL,
	`position` int unsigned NOT NULL,
	`club` varchar(100) NOT NULL,
	`played` int unsigned NOT NULL,
	`won` int unsigned NOT NULL,
	`drawn` int unsigned NOT NULL,
	`lost` int unsigned NOT NULL,
	`goals_for` int unsigned NOT NULL,
	`goals_against` int unsigned NOT NULL,
	`goal_difference` int NOT NULL,
	`points` int unsigned NOT NULL,
	`valid_on` date NOT NULL,
	CONSTRAINT `standings_season_position` PRIMARY KEY(`season`,`position`),
	CONSTRAINT `standings_season_club_unique` UNIQUE(`season`,`club`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `wikipedia_pages` (
	`title` varchar(200) NOT NULL,
	`season` varchar(7) NOT NULL,
	`kind` enum('standings','programme','cup') NOT NULL,
	`version` varchar(100),
	`read_at` datetime NOT NULL,
	CONSTRAINT `wikipedia_pages_title` PRIMARY KEY(`title`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `matches_season_match_date_idx` ON `matches` (`season`,`match_date`);