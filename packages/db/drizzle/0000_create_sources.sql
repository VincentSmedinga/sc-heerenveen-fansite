-- drizzle-kit leaves out the character set, and MariaDB 10.11 defaults to latin1, so each CREATE TABLE gets it by hand.
CREATE TABLE `sources` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`domain` varchar(253) NOT NULL,
	`kind` enum('news','podcast','forum','club','video') NOT NULL,
	`intro_max_length` int unsigned NOT NULL DEFAULT 0,
	`allow_image` boolean NOT NULL DEFAULT false,
	`allow_embed` boolean NOT NULL DEFAULT false,
	`attribution` varchar(150),
	`consent_status` enum('none','asked','given') NOT NULL DEFAULT 'none',
	`consent_date` date,
	`consent_note` text,
	`enabled` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
	CONSTRAINT `sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `sources_domain_unique` UNIQUE(`domain`),
	CONSTRAINT `sources_display_needs_consent` CHECK(`sources`.`consent_status` = 'given' or (`sources`.`intro_max_length` = 0 and `sources`.`allow_image` = false and `sources`.`allow_embed` = false))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
