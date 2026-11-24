-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLEs get it by hand.
CREATE TABLE `browser_visitors` (
	`day` date NOT NULL,
	`browser` enum('Chrome','Safari','Firefox','Edge','Samsung Internet','overig') NOT NULL,
	`os` enum('Android','iOS','Windows','macOS','Linux','overig') NOT NULL,
	`device` enum('telefoon','tablet','computer') NOT NULL,
	`visitors` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `browser_visitors_day_kinds` PRIMARY KEY(`day`,`browser`,`os`,`device`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `page_transitions` (
	`day` date NOT NULL,
	`source` varchar(100) NOT NULL,
	`path` varchar(100) NOT NULL,
	`views` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `page_transitions_day_source_path` PRIMARY KEY(`day`,`source`,`path`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
