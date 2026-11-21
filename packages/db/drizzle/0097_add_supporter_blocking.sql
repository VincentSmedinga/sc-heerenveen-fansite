-- Adds `supporter_blocked_addresses` for #1458: the SHA-256 of the address of a blocked account that was closed, with the moment. No row is written.
-- Adds the four actions of the editors on supporters to `audit_log`, and `supporters.screen_name_edited_by_editors`, which tells a supporter once that the editors changed the name.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE supporter_blocked_addresses` and `ALTER TABLE supporters DROP COLUMN screen_name_edited_by_editors`; only the hashes are lost.
CREATE TABLE IF NOT EXISTS `supporter_blocked_addresses` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`address_hash` varchar(64) NOT NULL,
	`blocked_at` datetime NOT NULL,
	CONSTRAINT `supporter_blocked_addresses_id` PRIMARY KEY(`id`),
	CONSTRAINT `supporter_blocked_addresses_address_hash_unique` UNIQUE(`address_hash`),
	INDEX `supporter_blocked_addresses_blocked_at_idx` (`blocked_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `action` enum('item.hide','item.show','item.approve','item.unapprove','article.create','article.update','article.publish','article.unpublish','match.edit','match.undo','match.caught-up','match.differs','match.take-over','match.keep','match.add','match.delete','stadium.save','stadium.reset','club-name.save','club-name.reset','player.stats-differ','player.stats-take-over','player.stats-keep','player.add','player.edit','player.remove','player.field-take-over','player.field-keep','person.edit','person.merge','account.create','account.edit','account.disable','account.enable','club.edit','ground.create','ground.edit','ground-name.save','home-ground.save','gap.mark','gap.renew','gap.unmark','club.merge','supporter.rename','supporter.block','supporter.unblock','supporter.forget-address') NOT NULL;
--> statement-breakpoint
ALTER TABLE `supporters` ADD COLUMN IF NOT EXISTS `screen_name_edited_by_editors` boolean DEFAULT false NOT NULL;
