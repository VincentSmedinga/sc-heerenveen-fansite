-- Gives a source the publisher it belongs to and whether it is the local paper of that publisher: two sources of one publisher that print the same article under one article code show it once in the lists, under the local one. Both are empty (no publisher, not local) until the seed fills them.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `sources` ADD COLUMN IF NOT EXISTS `publisher` varchar(100);--> statement-breakpoint
ALTER TABLE `sources` ADD COLUMN IF NOT EXISTS `local` boolean DEFAULT false NOT NULL;
