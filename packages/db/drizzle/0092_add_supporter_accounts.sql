-- Adds the accounts of supporters for the chapter Fans (#1446), in four tables apart from those of the admin: `supporters` (the screen name, its normalised form, the address, the choice for the rankings, when it was made, the day of the last visit, the last change of name and whether and why it is blocked), `supporter_login_links` (the links and codes that were mailed, a sign-up included, until it is confirmed), `supporter_sessions` and `supporter_login_attempts` (for the limits). No row is written.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so each CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE supporter_login_attempts, supporter_sessions, supporter_login_links, supporters`; the accounts of supporters would be lost, so make a back-up first.
CREATE TABLE IF NOT EXISTS `supporter_login_attempts` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`address_hash` varchar(64),
	`attempted_at` datetime NOT NULL,
	CONSTRAINT `supporter_login_attempts_id` PRIMARY KEY(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `supporter_login_links` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`supporter_id` int unsigned,
	`expires_at` datetime NOT NULL,
	`ref_hash` varchar(64),
	`code_hash` varchar(64),
	`failed_attempts` int unsigned NOT NULL DEFAULT 0,
	`email` varchar(254),
	`screen_name` varchar(20),
	`screen_name_key` varchar(40),
	CONSTRAINT `supporter_login_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `supporter_login_links_token_hash_unique` UNIQUE(`token_hash`),
	CONSTRAINT `supporter_login_links_ref_hash_unique` UNIQUE(`ref_hash`),
	CONSTRAINT `supporter_login_links_login_or_sign_up` CHECK((`supporter_id` IS NOT NULL AND `email` IS NULL AND `screen_name` IS NULL AND `screen_name_key` IS NULL) OR (`supporter_id` IS NULL AND `email` IS NOT NULL AND `screen_name` IS NOT NULL AND `screen_name_key` IS NOT NULL))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `supporter_sessions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`supporter_id` int unsigned NOT NULL,
	`created_at` datetime NOT NULL,
	`last_seen_at` datetime NOT NULL,
	CONSTRAINT `supporter_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `supporter_sessions_token_hash_unique` UNIQUE(`token_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `supporters` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`screen_name` varchar(20) NOT NULL,
	`screen_name_key` varchar(40) NOT NULL,
	`email` varchar(254) NOT NULL,
	`in_rankings` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	`last_visit_on` date,
	`screen_name_changed_at` datetime,
	`disabled_at` datetime,
	`disabled_reason` varchar(500),
	CONSTRAINT `supporters_id` PRIMARY KEY(`id`),
	CONSTRAINT `supporters_screen_name_key_unique` UNIQUE(`screen_name_key`),
	CONSTRAINT `supporters_email_unique` UNIQUE(`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `supporter_login_links` ADD CONSTRAINT `supporter_login_links_supporter_id_supporters_id_fk` FOREIGN KEY IF NOT EXISTS (`supporter_id`) REFERENCES `supporters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supporter_sessions` ADD CONSTRAINT `supporter_sessions_supporter_id_supporters_id_fk` FOREIGN KEY IF NOT EXISTS (`supporter_id`) REFERENCES `supporters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `supporter_login_attempts_address_hash_attempted_at_idx` ON `supporter_login_attempts` (`address_hash`,`attempted_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `supporter_login_attempts_attempted_at_idx` ON `supporter_login_attempts` (`attempted_at`);