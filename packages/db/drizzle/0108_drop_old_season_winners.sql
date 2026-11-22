-- Drops `old_season_winners` for #1465: the Uitblinker of the year is now worked out from the season ratings, so nothing writes or reads the table. It was always empty: the names were never typed over.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host, make the table again as `0101_add_supporter_ratings` did; no data is lost, because the table held none.
DROP TABLE IF EXISTS `old_season_winners`;
