-- Gives an item the key of its story: a source that puts a story in its feed again under a new headline (a live blog) gives every version a link with the same code, and the pages show the newest version only. The key is empty until the importer fills it, and for a source with no rule for it.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `items` ADD COLUMN IF NOT EXISTS `thread_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `items_source_id_thread_key_idx` ON `items` (`source_id`,`thread_key`);
