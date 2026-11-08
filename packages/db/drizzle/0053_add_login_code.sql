-- Lets a login link carry a code of 6 digits (#938), for logging in in the app on the Home Screen, which has a cookie jar of its own and can't open the link. A row keeps the SHA-256 of a random reference and of the reference with the code, never the code, and counts the wrong codes. Links that exist already have no code.
-- The migration only adds. To undo it on the host: `ALTER TABLE admin_login_links DROP INDEX admin_login_links_ref_hash_unique, DROP COLUMN ref_hash, DROP COLUMN code_hash, DROP COLUMN failed_attempts`; no data is lost.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `admin_login_links` ADD COLUMN IF NOT EXISTS `ref_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `admin_login_links` ADD COLUMN IF NOT EXISTS `code_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `admin_login_links` ADD COLUMN IF NOT EXISTS `failed_attempts` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `admin_login_links_ref_hash_unique` ON `admin_login_links` (`ref_hash`);
