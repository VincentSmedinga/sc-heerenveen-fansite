// The mail code lives in @fansite/shared, so the importer sends mail the same way. The site
// imports it from here.
export { MailError, sendMail } from '@fansite/shared/mail'
export type { Mail } from '@fansite/shared/mail'
