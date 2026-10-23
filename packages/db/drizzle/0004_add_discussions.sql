-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so each CREATE TABLE gets it by hand.
CREATE TABLE `discussions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`source_id` int unsigned NOT NULL,
	`url` varchar(2048) NOT NULL,
	`title` varchar(500) NOT NULL,
	`reply_count` int unsigned NOT NULL,
	`last_posted_at` datetime NOT NULL,
	`last_posted_by` varchar(150),
	CONSTRAINT `discussions_id` PRIMARY KEY(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `discussions` ADD CONSTRAINT `discussions_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE cascade ON UPDATE no action;