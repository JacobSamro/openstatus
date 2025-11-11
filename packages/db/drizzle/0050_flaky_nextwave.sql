CREATE TABLE `heartbeat_data` (
	`id` integer PRIMARY KEY NOT NULL,
	`monitor_id` integer NOT NULL,
	`timestamp` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`message` text,
	`metadata` text,
	`status` text DEFAULT 'received',
	FOREIGN KEY (`monitor_id`) REFERENCES `monitor`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `heartbeat_data_monitor_id_idx` ON `heartbeat_data` (`monitor_id`);--> statement-breakpoint
ALTER TABLE `monitor` ADD `heartbeat_interval` integer;--> statement-breakpoint
ALTER TABLE `monitor` ADD `heartbeat_timeout` integer;--> statement-breakpoint
ALTER TABLE `monitor` ADD `last_heartbeat_at` integer;