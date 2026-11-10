-- Keeps what the editors set of a player when the import says something else (issue 1022): `players.editors_fields` lists the fields the editors set, which the importer never writes, and the table `player_field_differences` keeps the other value of the import until the editors decide.
-- The log of the admin gets `player.field-take-over` and `player.field-keep`, the decision about such a difference.
-- The last two statements mark what the editors set since issue 1020: of a player they added (the source `redactie`) the name and every field that is filled in, and of a player they changed the fields the line `player.edit` of the log names. They only add a mark, so they can run again.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `DROP TABLE player_field_differences`, `ALTER TABLE players DROP COLUMN editors_fields`, and put the list of actions back as it was after removing the rows with the two new actions.
CREATE TABLE IF NOT EXISTS `player_field_differences` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`player_id` int unsigned NOT NULL,
	`season` varchar(7) NOT NULL,
	`field` enum('name','shirt_number','position','wikipedia_page') NOT NULL,
	`editors_value` varchar(255),
	`import_value` varchar(255) NOT NULL,
	`status` enum('pending','accepted','rejected') NOT NULL,
	`resolution` enum('person','reverted','replaced'),
	`first_seen_at` datetime NOT NULL,
	`last_seen_at` datetime NOT NULL,
	`decided_at` datetime,
	CONSTRAINT `player_field_differences_id` PRIMARY KEY(`id`),
	CONSTRAINT `player_field_differences_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action,
	INDEX `player_field_differences_season_status_idx` (`season`,`status`),
	INDEX `player_field_differences_player_idx` (`player_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `action` enum('item.hide','item.show','item.approve','item.unapprove','article.create','article.update','article.publish','article.unpublish','match.edit','match.undo','match.caught-up','match.differs','match.take-over','match.keep','match.add','match.delete','stadium.save','stadium.reset','club-name.save','club-name.reset','player.stats-differ','player.stats-take-over','player.stats-keep','player.add','player.edit','player.remove','player.field-take-over','player.field-keep') NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN IF NOT EXISTS `editors_fields` set('name','shirt_number','position','wikipedia_page') DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `players` SET `editors_fields` = CONCAT_WS(',', NULLIF(`editors_fields`, ''), 'name', IF(`shirt_number` IS NULL, NULL, 'shirt_number'), IF(`position` IS NULL, NULL, 'position'), IF(`wikipedia_page` IS NULL, NULL, 'wikipedia_page')) WHERE `source` = 'redactie';--> statement-breakpoint
UPDATE `players` SET `editors_fields` = CONCAT_WS(',', NULLIF(`editors_fields`, ''), IF(EXISTS (SELECT 1 FROM `audit_log` WHERE `action` = 'player.edit' AND `item_id` = `players`.`id` AND (`detail` LIKE '%. naam: %' OR `detail` LIKE '%naam in delen van de persoon%')), 'name', NULL), IF(EXISTS (SELECT 1 FROM `audit_log` WHERE `action` = 'player.edit' AND `item_id` = `players`.`id` AND `detail` LIKE '% rugnummer: %'), 'shirt_number', NULL), IF(EXISTS (SELECT 1 FROM `audit_log` WHERE `action` = 'player.edit' AND `item_id` = `players`.`id` AND `detail` LIKE '% positie: %'), 'position', NULL), IF(EXISTS (SELECT 1 FROM `audit_log` WHERE `action` = 'player.edit' AND `item_id` = `players`.`id` AND `detail` LIKE '% Wikipedia: %'), 'wikipedia_page', NULL)) WHERE `id` IN (SELECT `item_id` FROM `audit_log` WHERE `action` = 'player.edit');
