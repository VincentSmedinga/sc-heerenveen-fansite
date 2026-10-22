import type { ReleaseNotes } from './whats-new'

/**
 * What changed for visitors in each version, in Dutch: one sentence per change, as a visitor notices it. The page Wat is
 * er nieuw and its feed show a version once CHANGELOG.md has it, so sentences may be written before the release. A
 * version without sentences isn't shown. AGENTS.md says who writes them and when.
 */
export const releaseNotes: ReleaseNotes = {
  '0.1.0': [
    'Op de homepage lees je per dag de koppen van de Leeuwarder Courant over sc Heerenveen, van de afgelopen week.',
    'Bij Onze bronnen zie je welke media we volgen.',
    'Op Wat is er nieuw lees je per versie wat er veranderd is, ook met een RSS-feed.',
    'Elke pagina heeft bovenaan het logo en een menu met Onze bronnen en het forum, en onderaan een link naar Wat is er nieuw.',
    'De site is licht of donker, net zoals je je telefoon of computer hebt ingesteld.',
    'Lukt een pagina even niet, dan lees je wat je kunt doen: het opnieuw proberen of het melden op het forum.',
  ],
}
