CREATE TABLE `opponent_name_searches` (
	`name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
	`club_id` int unsigned NOT NULL,
	`season` varchar(7) NOT NULL,
	`searched_at` datetime NOT NULL,
	CONSTRAINT `opponent_name_searches_name_club_id_season_pk` PRIMARY KEY(`name`,`club_id`,`season`)
);
--> statement-breakpoint
ALTER TABLE `opponent_name_searches` ADD CONSTRAINT `opponent_name_searches_club_id_clubs_id_fk` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE cascade ON UPDATE no action;