-- Gives `standings` the league the table is of (#1402): the Eredivisie, or the Eerste divisie for 1991/92 and 1992/93. Every row that is there is a table of the Eredivisie, so the column starts as that.
-- The key stays (season, position): a season has one table, because sc Heerenveen plays in one league.
-- To undo it on the host: `ALTER TABLE standings DROP COLUMN competition;`, after deleting the tables of the Eerste divisie.
-- (The generated file also had `group_standings.read_at`: the file 0090 has that column already, only its snapshot lacked it, so it is not added twice.)
ALTER TABLE `standings` ADD `competition` enum('Eredivisie','Eerste divisie') DEFAULT 'Eredivisie' NOT NULL;