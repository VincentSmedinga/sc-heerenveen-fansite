-- Adds `supporter_email_changes` for #1452: a request of a supporter to change the address of the account, until the link or the code that went to the new address is used or expires. No row is written.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE supporter_email_changes`; only requests that are still waiting are lost.
CREATE TABLE IF NOT EXISTS `supporter_email_changes` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`supporter_id` int unsigned NOT NULL,
	`email` varchar(254) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`ref_hash` varchar(64),
	`code_hash` varchar(64),
	`failed_attempts` int unsigned NOT NULL DEFAULT 0,
	`expires_at` datetime NOT NULL,
	CONSTRAINT `supporter_email_changes_id` PRIMARY KEY(`id`),
	CONSTRAINT `supporter_email_changes_token_hash_unique` UNIQUE(`token_hash`),
	CONSTRAINT `supporter_email_changes_ref_hash_unique` UNIQUE(`ref_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `supporter_email_changes` ADD CONSTRAINT `supporter_email_changes_supporter_id_supporters_id_fk` FOREIGN KEY IF NOT EXISTS (`supporter_id`) REFERENCES `supporters`(`id`) ON DELETE cascade ON UPDATE no action;
