-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so each CREATE TABLE gets it by hand.
CREATE TABLE `import_results` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`run_id` int unsigned NOT NULL,
	`feed_id` int unsigned NOT NULL,
	`outcome` enum('imported','not-modified','blocked-by-robots','wait','postponed','error') NOT NULL,
	`added` int unsigned NOT NULL DEFAULT 0,
	`updated` int unsigned NOT NULL DEFAULT 0,
	`unchanged` int unsigned NOT NULL DEFAULT 0,
	`skipped` int unsigned NOT NULL DEFAULT 0,
	`reason` varchar(300),
	CONSTRAINT `import_results_id` PRIMARY KEY(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `import_runs` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`started_at` datetime NOT NULL,
	`finished_at` datetime,
	`lock_taken` boolean NOT NULL DEFAULT false,
	CONSTRAINT `import_runs_id` PRIMARY KEY(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `robots_txt` (
	`origin` varchar(300) NOT NULL,
	`rules` mediumtext NOT NULL,
	`fetched_at` datetime NOT NULL,
	CONSTRAINT `robots_txt_origin` PRIMARY KEY(`origin`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `feeds` ADD `last_success_at` datetime;--> statement-breakpoint
ALTER TABLE `feeds` ADD `failures_in_a_row` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `feeds` ADD `last_error` varchar(300);--> statement-breakpoint
ALTER TABLE `feeds` ADD `last_error_at` datetime;--> statement-breakpoint
ALTER TABLE `feeds` ADD `retry_at` datetime;--> statement-breakpoint
ALTER TABLE `import_results` ADD CONSTRAINT `import_results_run_id_import_runs_id_fk` FOREIGN KEY (`run_id`) REFERENCES `import_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_results` ADD CONSTRAINT `import_results_feed_id_feeds_id_fk` FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON DELETE cascade ON UPDATE no action;