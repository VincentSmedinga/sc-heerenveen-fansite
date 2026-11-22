CREATE TABLE `club_squad_imports` (
	`club_id` int unsigned NOT NULL,
	`last_success_at` datetime,
	`last_outcome` enum('imported','error','blocked-by-robots','wait') NOT NULL,
	`failures_in_a_row` int unsigned NOT NULL DEFAULT 0,
	`last_error` varchar(300),
	`last_error_at` datetime,
	`last_warning` varchar(300),
	`last_warning_at` datetime,
	`retry_at` datetime,
	CONSTRAINT `club_squad_imports_club_id` PRIMARY KEY(`club_id`)
);
--> statement-breakpoint
CREATE TABLE `club_squad_players` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`club_id` int unsigned NOT NULL,
	`name` varchar(100) NOT NULL,
	`person_id` int unsigned,
	`shirt_number` int unsigned,
	`position` enum('doelman','verdediger','middenvelder','aanvaller'),
	`read_at` datetime NOT NULL,
	CONSTRAINT `club_squad_players_id` PRIMARY KEY(`id`),
	CONSTRAINT `club_squad_players_club_name_unique` UNIQUE(`club_id`,`name`)
);
--> statement-breakpoint
ALTER TABLE `club_squad_imports` ADD CONSTRAINT `club_squad_imports_club_id_clubs_id_fk` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `club_squad_players` ADD CONSTRAINT `club_squad_players_club_id_clubs_id_fk` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `club_squad_players` ADD CONSTRAINT `club_squad_players_person_id_persons_id_fk` FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `club_squad_players_person_id_idx` ON `club_squad_players` (`person_id`);