-- Gives every article the account that changed it last and a first version, and creates the table of versions.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
CREATE TABLE IF NOT EXISTS `article_versions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`article_id` int unsigned NOT NULL,
	`version` int unsigned NOT NULL,
	`title` varchar(120) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`intro` varchar(300) NOT NULL,
	`body` mediumtext NOT NULL,
	`author` varchar(100) NOT NULL,
	`saved_at` datetime NOT NULL,
	`saved_by` int unsigned NOT NULL,
	CONSTRAINT `article_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `article_versions_article_id_version_unique` UNIQUE(`article_id`,`version`),
	CONSTRAINT `article_versions_article_id_articles_id_fk` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `article_versions_saved_by_admin_users_id_fk` FOREIGN KEY (`saved_by`) REFERENCES `admin_users`(`id`) ON DELETE no action ON UPDATE no action
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
-- The column starts empty, because the articles that are there have no value yet.
ALTER TABLE `articles` ADD COLUMN IF NOT EXISTS `updated_by` int unsigned;
--> statement-breakpoint
UPDATE `articles` SET `updated_by` = `created_by` WHERE `updated_by` IS NULL;
--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `updated_by` int unsigned NOT NULL;
--> statement-breakpoint
ALTER TABLE `articles` ADD CONSTRAINT `articles_updated_by_admin_users_id_fk` FOREIGN KEY IF NOT EXISTS (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Version 1 of every article that has no version yet: its content as it is now, saved when it last changed and by whom.
INSERT INTO `article_versions` (`article_id`, `version`, `title`, `slug`, `intro`, `body`, `author`, `saved_at`, `saved_by`)
SELECT `id`, 1, `title`, `slug`, `intro`, `body`, `author`, `updated_at`, `updated_by`
FROM `articles`
WHERE NOT EXISTS (SELECT 1 FROM `article_versions` WHERE `article_versions`.`article_id` = `articles`.`id`);
