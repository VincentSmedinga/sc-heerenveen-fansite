-- Gives `match_edits` a fourth part the editors can hold: `facts_edited` for the spectators, the referee, the stadium and the note, with `reported_facts` for what Wikipedia last said about them. `match_changes.part` gets `facts` too.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
ALTER TABLE `match_edits` DROP CONSTRAINT IF EXISTS `match_edits_a_part_is_edited`;--> statement-breakpoint
ALTER TABLE `match_changes` MODIFY COLUMN `part` enum('kickoff','result','goals','facts');--> statement-breakpoint
ALTER TABLE `match_edits` ADD COLUMN IF NOT EXISTS `facts_edited` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `match_edits` ADD COLUMN IF NOT EXISTS `reported_facts` text;--> statement-breakpoint
ALTER TABLE `match_edits` ADD CONSTRAINT `match_edits_a_part_is_edited` CHECK (`match_edits`.`kickoff_edited` = 1 or `match_edits`.`result_edited` = 1 or `match_edits`.`goals_edited` = 1 or `match_edits`.`facts_edited` = 1);
