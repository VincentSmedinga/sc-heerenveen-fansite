-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so each CREATE TABLE gets it by hand.
CREATE TABLE `articles` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`title` varchar(120) NOT NULL,
	`intro` varchar(300) NOT NULL,
	`body` mediumtext NOT NULL,
	`author` varchar(100) NOT NULL,
	`published_at` datetime,
	`created_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	`updated_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	`created_by` int unsigned NOT NULL,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `articles_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `articles_slug_format` CHECK(`articles`.`slug` regexp '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$')
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `articles` ADD CONSTRAINT `articles_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `articles_published_at_idx` ON `articles` (`published_at`);