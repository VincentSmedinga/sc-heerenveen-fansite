CREATE TABLE `quiz_questions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`quiz_id` int unsigned NOT NULL,
	`position` tinyint unsigned NOT NULL,
	`text` varchar(1000) NOT NULL,
	`answers` json NOT NULL,
	`correct_answer` tinyint unsigned NOT NULL,
	`percentages` json,
	CONSTRAINT `quiz_questions_id` PRIMARY KEY(`id`),
	CONSTRAINT `quiz_questions_position_unique` UNIQUE(`quiz_id`,`position`),
	CONSTRAINT `quiz_questions_position_in_range` CHECK(`quiz_questions`.`position` between 1 and 10),
	CONSTRAINT `quiz_questions_correct_in_range` CHECK(`quiz_questions`.`correct_answer` between 1 and 4),
	CONSTRAINT `quiz_questions_four_answers` CHECK(json_length(`quiz_questions`.`answers`) = 4)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`year` smallint unsigned NOT NULL,
	`month` tinyint unsigned NOT NULL,
	`source` enum('oude-fansite','redactie') NOT NULL,
	`status` enum('draft','published') NOT NULL,
	`participants` int unsigned,
	`average_score_tenths` smallint unsigned,
	CONSTRAINT `quizzes_id` PRIMARY KEY(`id`),
	CONSTRAINT `quizzes_year_month_unique` UNIQUE(`year`,`month`),
	CONSTRAINT `quizzes_month_in_range` CHECK(`quizzes`.`month` between 1 and 12),
	CONSTRAINT `quizzes_average_in_range` CHECK(`quizzes`.`average_score_tenths` is null or `quizzes`.`average_score_tenths` <= 100)
);
--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD CONSTRAINT `quiz_questions_quiz_id_quizzes_id_fk` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE cascade ON UPDATE no action;