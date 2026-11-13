-- Gives a person a side (#1194): `links`, `midden` or `rechts`, as the editors say it, seen in the direction of the attack. It is empty until someone sets it, and no import reads or replaces it.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `ALTER TABLE persons DROP COLUMN side`; the sides the editors gave are then gone.
ALTER TABLE `persons` ADD COLUMN IF NOT EXISTS `side` enum('links','midden','rechts');
