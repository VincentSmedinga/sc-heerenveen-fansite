-- Adds `squad_complete_marks` for #1675: the seasons whose squad the editors marked as complete, with who did it and when. No row is written.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand.
-- To undo it on the host: `DROP TABLE squad_complete_marks`; only the marks are lost, and `import:completeness` then works the seasons out without them. The two new actions of the log can stay.
CREATE TABLE IF NOT EXISTS `squad_complete_marks` (
	`season` varchar(7) NOT NULL,
	`marked_by` int unsigned,
	`marked_at` datetime NOT NULL,
	CONSTRAINT `squad_complete_marks_season` PRIMARY KEY(`season`),
	CONSTRAINT `squad_complete_marks_marked_by_admin_users_id_fk` FOREIGN KEY (`marked_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `action` enum('item.hide','item.show','item.approve','item.unapprove','article.create','article.update','article.publish','article.unpublish','match.edit','match.undo','match.caught-up','match.differs','match.take-over','match.keep','match.add','match.delete','stadium.save','stadium.reset','club-name.save','club-name.reset','player.stats-differ','player.stats-take-over','player.stats-keep','player.add','player.edit','player.remove','player.field-take-over','player.field-keep','person.edit','person.merge','account.create','account.edit','account.disable','account.enable','club.edit','ground.create','ground.edit','ground-name.save','home-ground.save','gap.mark','gap.renew','gap.unmark','club.merge','supporter.rename','supporter.block','supporter.unblock','supporter.forget-address','quiz.create','quiz.edit','quiz.publish','squad.mark-complete','squad.unmark-complete') NOT NULL;
