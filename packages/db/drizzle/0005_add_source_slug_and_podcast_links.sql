ALTER TABLE `sources` ADD `slug` varchar(100);--> statement-breakpoint
ALTER TABLE `sources` ADD `apple_podcasts_url` varchar(300);--> statement-breakpoint
ALTER TABLE `sources` ADD `spotify_url` varchar(300);--> statement-breakpoint
ALTER TABLE `sources` ADD CONSTRAINT `sources_slug_unique` UNIQUE(`slug`);--> statement-breakpoint
ALTER TABLE `sources` ADD CONSTRAINT `sources_apple_podcasts_url_https` CHECK (`sources`.`apple_podcasts_url` like 'https://%');--> statement-breakpoint
ALTER TABLE `sources` ADD CONSTRAINT `sources_spotify_url_https` CHECK (`sources`.`spotify_url` like 'https://%');