-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so each CREATE TABLE gets it by hand.
CREATE TABLE `feeds` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`source_id` int unsigned NOT NULL,
	`url` varchar(500) NOT NULL,
	`etag` text,
	`last_modified` text,
	CONSTRAINT `feeds_id` PRIMARY KEY(`id`),
	CONSTRAINT `feeds_url_unique` UNIQUE(`url`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `items` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`source_id` int unsigned NOT NULL,
	`feed_id` int unsigned NOT NULL,
	`item_key` varchar(700) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
	`title` varchar(500) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`published_at` datetime NOT NULL,
	`paywalled` boolean NOT NULL DEFAULT false,
	`first_seen_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	`last_seen_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	CONSTRAINT `items_id` PRIMARY KEY(`id`),
	CONSTRAINT `items_source_id_item_key_unique` UNIQUE(`source_id`,`item_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `feeds` ADD CONSTRAINT `feeds_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_feed_id_feeds_id_fk` FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON DELETE cascade ON UPDATE no action;