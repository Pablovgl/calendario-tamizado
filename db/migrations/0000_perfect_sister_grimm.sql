CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_id` text,
	`titulo` text NOT NULL,
	`descripcion` text,
	`ubicacion` text,
	`inicio` text NOT NULL,
	`fin` text,
	`todo_el_dia` integer DEFAULT false NOT NULL,
	`url_origen` text,
	`confianza` integer,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`google_event_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tipo` text NOT NULL,
	`nombre` text NOT NULL,
	`url` text NOT NULL,
	`estado` text DEFAULT 'activa' NOT NULL,
	`ultimo_error` text,
	`ultima_revision` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`password_hash` text,
	`image` text,
	`google_refresh_token` text,
	`google_calendar_id` text DEFAULT 'primary' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);