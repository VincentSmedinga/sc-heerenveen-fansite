ALTER TABLE `feeds` ADD `filter` enum('none','club') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `import_results` ADD `relevant` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `import_results` ADD `doubtful` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `import_results` ADD `irrelevant` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `items` ADD `relevance` enum('relevant','doubtful','irrelevant') DEFAULT 'relevant' NOT NULL;