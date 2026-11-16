-- Removes the table `club_stadiums` (#1301): the stadiums of a club are now `stadiums`, `stadium_names` and `club_home_grounds` (#1297), and the card on the page of a club reads from them. The table had no rows on acceptance on 16 November 2026, so nothing is copied.
-- A table that still has rows is not dropped. The first statement adds a check that no row can pass, and MariaDB refuses it when the table has a row; its name says what to do: copy the rows to the new tables first.
-- To undo it on the host: the table is gone, so create it again as `0038_add_club_stadiums` made it; it had no rows to put back.
-- The statements can run again: a migration that stopped halfway finishes on the next start.

ALTER TABLE IF EXISTS `club_stadiums` ADD CONSTRAINT IF NOT EXISTS `club_stadiums_still_has_rows_copy_them_to_stadium_names_first` CHECK (1 = 0);--> statement-breakpoint
DROP TABLE IF EXISTS `club_stadiums`;
