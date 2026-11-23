CREATE TABLE `visit_exclusions` (
	`day` date NOT NULL,
	`reason` enum('bot','geen-taal','niet-volgen','vooruitladen') NOT NULL,
	`requests` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `visit_exclusions_day_reason` PRIMARY KEY(`day`,`reason`)
);
