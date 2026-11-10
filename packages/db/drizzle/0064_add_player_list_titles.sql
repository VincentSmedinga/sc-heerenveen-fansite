CREATE TABLE `player_list_titles` (
	`title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
	`read_at` datetime NOT NULL,
	CONSTRAINT `player_list_titles_title` PRIMARY KEY(`title`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
