-- Gives a match a line of text under it, for the one thing a column cannot say: a match that was stopped and finished later. The line is empty for every other match.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `matches` ADD COLUMN IF NOT EXISTS `note` varchar(255);
