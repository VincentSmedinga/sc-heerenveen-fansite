-- Lets a match be `cancelled`: called off and not played any more. Existing rows keep their status, and the CHECK rules already hold for it, because they only single out `played`.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `matches` MODIFY COLUMN `status` enum('scheduled','played','postponed','cancelled') NOT NULL;
