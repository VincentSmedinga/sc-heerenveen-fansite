-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so each CREATE TABLE gets it by hand.
CREATE TABLE `admin_login_attempts` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`address_hash` varchar(64) NOT NULL,
	`attempted_at` datetime NOT NULL,
	CONSTRAINT `admin_login_attempts_id` PRIMARY KEY(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `admin_login_links` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`user_id` int unsigned NOT NULL,
	`expires_at` datetime NOT NULL,
	CONSTRAINT `admin_login_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_login_links_token_hash_unique` UNIQUE(`token_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`user_id` int unsigned NOT NULL,
	`created_at` datetime NOT NULL,
	`last_seen_at` datetime NOT NULL,
	CONSTRAINT `admin_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_sessions_token_hash_unique` UNIQUE(`token_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(254) NOT NULL,
	`role` enum('beheerder','moderator') NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	`disabled_at` datetime,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_email_unique` UNIQUE(`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `admin_login_links` ADD CONSTRAINT `admin_login_links_user_id_admin_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_user_id_admin_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_login_attempts_address_hash_attempted_at_idx` ON `admin_login_attempts` (`address_hash`,`attempted_at`);--> statement-breakpoint
CREATE INDEX `admin_login_attempts_attempted_at_idx` ON `admin_login_attempts` (`attempted_at`);