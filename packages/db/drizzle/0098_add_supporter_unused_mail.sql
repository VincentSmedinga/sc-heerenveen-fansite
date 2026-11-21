-- Adds `supporters.unused_mail_sent_at` for #1460: when the one mail went out that says the account was not used for two years and goes in 30 days. It is empty for every account; a visit empties it again.
-- The statement can run again: MariaDB cannot undo DDL, so a migration that stopped halfway finishes on the next start.
-- To undo it on the host: `ALTER TABLE supporters DROP COLUMN unused_mail_sent_at`; only the moments of the mails are lost.
ALTER TABLE `supporters` ADD COLUMN IF NOT EXISTS `unused_mail_sent_at` datetime;
