-- Adds `supporters.remind_by_email` for #1459: whether a supporter chose a reminder by e-mail the day before a match. It is off for every account until the supporter turns it on. Nothing sends the reminder yet.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `ALTER TABLE supporters DROP COLUMN remind_by_email`; only the choices of supporters are lost.
ALTER TABLE `supporters` ADD COLUMN IF NOT EXISTS `remind_by_email` boolean DEFAULT false NOT NULL;