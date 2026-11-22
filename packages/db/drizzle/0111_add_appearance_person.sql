ALTER TABLE `match_appearances` ADD `person_id` int unsigned;--> statement-breakpoint
ALTER TABLE `match_appearances` ADD CONSTRAINT `match_appearances_person_id_persons_id_fk` FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `match_appearances_person_id_idx` ON `match_appearances` (`person_id`);