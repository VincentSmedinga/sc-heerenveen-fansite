-- Creates the table of the staff, with the role of each person, so the head coaches (role `coach`) can be kept with the day each period began and ended and how exactly that day is known.
-- The statements can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so the CREATE TABLE statement gets it by hand.
CREATE TABLE IF NOT EXISTS `staff` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`role` enum('coach') NOT NULL,
	`name` varchar(100) NOT NULL,
	`wikipedia_page` varchar(255),
	`start_date` date NOT NULL,
	`start_precision` enum('day','month','year') NOT NULL,
	`end_date` date,
	`end_precision` enum('day','month','year'),
	`interim` boolean NOT NULL DEFAULT false,
	`note` varchar(500),
	CONSTRAINT `staff_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_role_name_start_date_unique` UNIQUE(`role`,`name`,`start_date`),
	CONSTRAINT `staff_end_not_before_start` CHECK(`staff`.`end_date` is null or `staff`.`end_date` >= `staff`.`start_date`),
	CONSTRAINT `staff_end_precision_with_end_date` CHECK((`staff`.`end_date` is null) = (`staff`.`end_precision` is null)),
	CONSTRAINT `staff_start_date_fits_precision` CHECK((`staff`.`start_precision` = 'day') or (`staff`.`start_precision` = 'month' and dayofmonth(`staff`.`start_date`) = 1) or (`staff`.`start_precision` = 'year' and dayofyear(`staff`.`start_date`) = 1)),
	CONSTRAINT `staff_end_date_fits_precision` CHECK(`staff`.`end_date` is null or (`staff`.`end_precision` = 'day') or (`staff`.`end_precision` = 'month' and dayofmonth(`staff`.`end_date`) = 1) or (`staff`.`end_precision` = 'year' and dayofyear(`staff`.`end_date`) = 1))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `staff_role_start_date_idx` ON `staff` (`role`,`start_date`);