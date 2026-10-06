ALTER TABLE `events` ADD `dedupe_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `events_user_dedupe_idx` ON `events` (`user_id`,`dedupe_hash`);--> statement-breakpoint
ALTER TABLE `sources` ADD `last_content_hash` text;