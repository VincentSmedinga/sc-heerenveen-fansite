-- Lets the minute of a goal and of a card be empty (#872), since the old fansite did not know the minute of 4 goals and 793 yellow cards. Added time may only go with a minute, and a red or yellow-red card keeps its minute. The minute of a substitution, a missed penalty and a kick of the shoot-out stays required.
-- The migration only loosens the columns, and adds three checks and rewrites one. The check from 1 to 120 on a card stays, and lets an empty minute through. To undo it on the host, first check that no row has an empty minute (`SELECT COUNT(*) FROM match_goals WHERE minute IS NULL` and the same for `match_cards`), and only then run `ALTER TABLE match_goals MODIFY COLUMN minute int unsigned NOT NULL` and `ALTER TABLE match_cards MODIFY COLUMN minute int unsigned NOT NULL`. Until the rows are given a minute, or deleted, MariaDB refuses. The three checks may stay.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `match_goals` MODIFY COLUMN `minute` int unsigned;
--> statement-breakpoint
ALTER TABLE `match_cards` MODIFY COLUMN `minute` int unsigned;
--> statement-breakpoint
ALTER TABLE `match_goals` ADD CONSTRAINT IF NOT EXISTS `match_goals_stoppage_needs_minute` CHECK (`stoppage_minutes` is null or `minute` is not null);
--> statement-breakpoint
ALTER TABLE `match_cards` ADD CONSTRAINT IF NOT EXISTS `match_cards_red_needs_minute` CHECK (`kind` = 'geel' or `minute` is not null);
--> statement-breakpoint
ALTER TABLE `match_cards` DROP CONSTRAINT IF EXISTS `match_cards_stoppage_range`;
--> statement-breakpoint
ALTER TABLE `match_cards` ADD CONSTRAINT `match_cards_stoppage_range` CHECK (`stoppage_minutes` is null or (`stoppage_minutes` between 1 and 15 and `minute` is not null and `minute` in (45, 90, 105, 120)));
