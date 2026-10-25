CREATE TABLE `audit_log` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`created_at` datetime NOT NULL,
	`user_id` int unsigned NOT NULL,
	`action` enum('item.hide','item.show') NOT NULL,
	`item_id` int unsigned NOT NULL,
	`reason` varchar(300),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `items` ADD `hidden_at` datetime;--> statement-breakpoint
ALTER TABLE `items` ADD `hidden_by` int unsigned;--> statement-breakpoint
ALTER TABLE `items` ADD `hidden_reason` varchar(300);--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_user_id_admin_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_log_item_id_idx` ON `audit_log` (`item_id`);--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_hidden_by_admin_users_id_fk` FOREIGN KEY (`hidden_by`) REFERENCES `admin_users`(`id`) ON DELETE no action ON UPDATE no action;