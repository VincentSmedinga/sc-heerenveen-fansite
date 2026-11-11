-- Gives the page of a player an address of his name (#1079): `persons.slug` is the slug of now, and `person_slugs` keeps every slug a person ever had, so an old address leads to the page of now. Both start empty: the site fills them when it starts, after the migrations (`updatePlayerAddresses`).
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `DROP TABLE person_slugs` and `ALTER TABLE persons DROP INDEX persons_slug_unique, DROP COLUMN slug`; the old addresses of the players stop working with it.
CREATE TABLE IF NOT EXISTS `person_slugs` (
	`slug` varchar(100) NOT NULL,
	`person_id` int unsigned NOT NULL,
	CONSTRAINT `person_slugs_slug` PRIMARY KEY(`slug`),
	CONSTRAINT `person_slugs_person_id_persons_id_fk` FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON DELETE cascade ON UPDATE no action,
	CONSTRAINT `person_slugs_slug_format` CHECK(`slug` regexp '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$')
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;--> statement-breakpoint
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `slug` varchar(100);--> statement-breakpoint
ALTER TABLE `persons` ADD UNIQUE INDEX IF NOT EXISTS `persons_slug_unique` (`slug`);
