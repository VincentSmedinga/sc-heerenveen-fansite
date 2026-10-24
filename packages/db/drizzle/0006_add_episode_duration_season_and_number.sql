-- A feed that was read before this migration has items without the new columns, and a feed that says "not modified" would
-- never fill them. Forgetting the ETag and Last-Modified makes the next run read every feed once in full.
ALTER TABLE `items` ADD `duration_seconds` int unsigned;--> statement-breakpoint
ALTER TABLE `items` ADD `season_number` int unsigned;--> statement-breakpoint
ALTER TABLE `items` ADD `episode_number` int unsigned;--> statement-breakpoint
UPDATE `feeds` SET `etag` = NULL, `last_modified` = NULL;
