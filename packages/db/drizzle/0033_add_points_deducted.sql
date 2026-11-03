-- Gives a row of the league table the points the club lost to a deduction, as the column PA of Wikipedia gives them. `points` stays the number of the page, so after the deduction. Existing rows get 0.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `standings` ADD COLUMN IF NOT EXISTS `points_deducted` int unsigned DEFAULT 0 NOT NULL;
