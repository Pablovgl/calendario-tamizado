ALTER TABLE `users` ADD `feed_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_feed_token_unique` ON `users` (`feed_token`);