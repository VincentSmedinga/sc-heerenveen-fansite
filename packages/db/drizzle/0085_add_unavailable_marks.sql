-- Adds `unavailable_marks` (#1308): an editor marks a gap that nobody can fill, a person without a Wikipedia page or without a known birth date, as not available, with the day of the last check. One row for one fact of one person (`subject` is `person` for now, `subject_id` its number, no foreign key so a match can share the table later), unique per subject and field. The log of the admin gets `gap.mark`, `gap.renew` and `gap.unmark` as new values at the end of the list. No row changes.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE gets it by hand. The foreign key to `admin_users` is inside the CREATE TABLE, so the migration can run again.
-- To undo it on the host: remove the rows with the three actions from `audit_log`, put the list of actions back as it was with `ALTER TABLE audit_log MODIFY COLUMN action enum(...)` without the last three values, and `DROP TABLE unavailable_marks`; the marks of the editors would be lost, so make a back-up first.

CREATE TABLE IF NOT EXISTS `unavailable_marks` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`subject` enum('person') NOT NULL,
	`subject_id` int unsigned NOT NULL,
	`field` enum('wikipedia','geboren') NOT NULL,
	`checked_on` date NOT NULL,
	`user_id` int unsigned,
	CONSTRAINT `unavailable_marks_id` PRIMARY KEY(`id`),
	CONSTRAINT `unavailable_marks_subject_subject_id_field_unique` UNIQUE(`subject`,`subject_id`,`field`),
	CONSTRAINT `unavailable_marks_user_id_admin_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `action` enum('item.hide','item.show','item.approve','item.unapprove','article.create','article.update','article.publish','article.unpublish','match.edit','match.undo','match.caught-up','match.differs','match.take-over','match.keep','match.add','match.delete','stadium.save','stadium.reset','club-name.save','club-name.reset','player.stats-differ','player.stats-take-over','player.stats-keep','player.add','player.edit','player.remove','player.field-take-over','player.field-keep','person.edit','person.merge','account.create','account.edit','account.disable','account.enable','club.edit','ground.create','ground.edit','ground-name.save','home-ground.save','gap.mark','gap.renew','gap.unmark') NOT NULL;
