-- Stores which professional clubs a headline names, worked out by the importer (#794). The rows come from the titles of `items`.
-- The migration only adds a table, and it starts empty. The next import fills it for the items still in a feed, and `pnpm run import:item-clubs` (`import.mjs --item-clubs` on the host) fills it for every item that is in the database.
-- To undo it on the host, drop the table (`DROP TABLE item_clubs`): it holds only what the importer works out again from the titles, so no data is lost.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
CREATE TABLE IF NOT EXISTS `item_clubs` (
	`item_id` int unsigned NOT NULL,
	`club` varchar(100) NOT NULL,
	CONSTRAINT `item_clubs_item_id_club_pk` PRIMARY KEY(`item_id`,`club`),
	CONSTRAINT `item_clubs_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action,
	INDEX `item_clubs_club_idx` (`club`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
