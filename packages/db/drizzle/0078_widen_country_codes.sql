-- Widens every column with a country to six characters (#1277), so the four countries of the United Kingdom fit with their code of ISO 3166-2: `GB-ENG`, `GB-NIR`, `GB-SCT` and `GB-WLS`. The codes of two letters stay as they are, and so does every value in the columns: `MODIFY` only makes the column wider, and a `char` that becomes a `varchar` loses no data, since MariaDB did not store the padding of a `char` either.
-- The statements can run again: a column that is wide already stays as it is, and MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: first give every row with a longer code the code `GB` (`UPDATE clubs SET country = 'GB' WHERE CHAR_LENGTH(country) > 2`, and the same for `persons`, `player_list_titles` and `players`), then `ALTER TABLE clubs MODIFY COLUMN country char(2)` and the same for the other three. Without the first step MariaDB refuses the change, or cuts the code.
ALTER TABLE `clubs` MODIFY COLUMN `country` varchar(6);--> statement-breakpoint
ALTER TABLE `persons` MODIFY COLUMN `country` varchar(6);--> statement-breakpoint
ALTER TABLE `player_list_titles` MODIFY COLUMN `country` varchar(6);--> statement-breakpoint
ALTER TABLE `players` MODIFY COLUMN `country` varchar(6);
