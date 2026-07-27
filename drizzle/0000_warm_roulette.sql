CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`class_id` text,
	`title` text NOT NULL,
	`activity_type` text NOT NULL,
	`subject` text NOT NULL,
	`max_marks` integer NOT NULL,
	`assessment_date` text NOT NULL,
	`stage` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`answer_key` text,
	`rubric` text,
	`quality` integer DEFAULT 0 NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assessments_school_date_idx` ON `assessments` (`school_id`,`assessment_date`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`detail_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_events_school_created_idx` ON `audit_events` (`school_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`academic_year` text NOT NULL,
	`grade` text NOT NULL,
	`section` text NOT NULL,
	`subject` text NOT NULL,
	`teacher_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `classes_school_idx` ON `classes` (`school_id`);--> statement-breakpoint
CREATE TABLE `followup_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`intervention_id` text NOT NULL,
	`evidence_type` text NOT NULL,
	`students_completed` integer NOT NULL,
	`average_mastery` integer,
	`outcome` text NOT NULL,
	`notes` text,
	`recorded_at` text NOT NULL,
	FOREIGN KEY (`intervention_id`) REFERENCES `interventions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `grade_results` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`file_id` text NOT NULL,
	`student_id` text,
	`student_name` text NOT NULL,
	`question_paper_file_id` text,
	`score` integer NOT NULL,
	`max_marks` integer NOT NULL,
	`confidence` integer,
	`feedback` text,
	`gaps_json` text NOT NULL,
	`teacher_status` text DEFAULT 'Draft' NOT NULL,
	`grading_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`file_id`) REFERENCES `uploaded_files`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grade_results_assessment_file_version_uq` ON `grade_results` (`assessment_id`,`file_id`,`grading_version`);--> statement-breakpoint
CREATE INDEX `grade_results_student_idx` ON `grade_results` (`student_id`);--> statement-breakpoint
CREATE TABLE `interventions` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`concept` text NOT NULL,
	`format` text NOT NULL,
	`duration` text NOT NULL,
	`status` text NOT NULL,
	`followup_date` text,
	`plan_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` text PRIMARY KEY NOT NULL,
	`intervention_id` text,
	`title` text NOT NULL,
	`resource_type` text NOT NULL,
	`status` text NOT NULL,
	`content_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`intervention_id`) REFERENCES `interventions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text,
	`board` text,
	`settings_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`class_id` text,
	`name` text NOT NULL,
	`roll_number` text,
	`status` text DEFAULT 'Active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `students_class_idx` ON `students` (`class_id`);--> statement-breakpoint
CREATE TABLE `uploaded_files` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text,
	`r2_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`purpose` text NOT NULL,
	`processing_status` text NOT NULL,
	`ocr_text` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `uploaded_files_assessment_idx` ON `uploaded_files` (`assessment_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`phone` text,
	`status` text DEFAULT 'Active' NOT NULL,
	`profile_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_school_email_uq` ON `users` (`school_id`,`email`);--> statement-breakpoint
CREATE TABLE `workspace_snapshots` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
