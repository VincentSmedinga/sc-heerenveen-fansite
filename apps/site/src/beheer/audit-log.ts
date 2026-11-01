// The log of the admin is written by one function, which lives in the database package so the
// importer can write to it too (see `recordAction` there).
export { type AuditEntry, recordAction } from '@fansite/db/audit-log'
