import type { ReleaseNotes } from './updates'

/**
 * What changed for visitors in each version, in Dutch: one short line per change, as a visitor
 * notices it. The page Updates and its feed show a version once CHANGELOG.md has it, so lines
 * may be written before the release. A version without lines isn't shown. AGENTS.md says how to
 * write them, and who writes them and when.
 */
export const releaseNotes: ReleaseNotes = {
  '0.1.0': [
    'Op home: het nieuws over onze club van de afgelopen week.',
    'Koppen van LC en VI met dag en tijd. Alleen voor abonnees? Staat erbij.',
    'Onze bronnen: welke media we volgen.',
    'Menu bovenaan: Nieuws, Onze bronnen en Forum.',
    'Onderaan: Over ons, met wie we zijn, hoe we werken en privacy.',
    'Updates: per versie wat er veranderd is, ook als RSS-feed.',
    'Licht of donker, net als je telefoon of computer.',
  ],
  '0.2.0': [
    'Op home: het nieuws van de afgelopen twee weken, de nieuwste podcasts en de laatste discussies van het forum.',
    'Podcasts: Omroep Abe en Radio Camataru. Kies een podcast, blader door de afleveringen en zie seizoen, nummer en lengte.',
    'Contact: schrijf de redactie met een formulier.',
    'Menu bovenaan: Nieuws, Podcasts en Forum. Onderaan: Over ons, Contact, Bronnen, Privacy, Toegankelijkheid en Updates.',
    'Licht of donker: kies zelf, onderaan de pagina.',
    'Site op je beginscherm gezet? Trek de pagina omlaag om te verversen.',
    'Toegankelijkheid: wat we beloven, wat we doen en hoe je een probleem meldt.',
  ],
  '0.3.0': [
    'Op home: de laatste wedstrijden en de stand in de Eredivisie.',
    'Wedstrijden: het programma, de uitslagen met doelpuntenmakers, de stand met een balk voor de punten, alle topscorers en wie de nul hield.',
    'Zoeken: vind koppen, podcastafleveringen en artikelen van de redactie.',
    'Nieuwe bronnen: NOS Voetbal, Algemeen Dagblad, ESPN en Omrop Fryslân.',
    'Van de redactie: eigen artikelen, op een eigen pagina en op home.',
    'Onze bronnen: lees waarom we iets wel of niet tonen.',
    'Bezoeken tellen we anoniem: zonder cookies en zonder je te volgen.',
    'Diverse verbeteringen in de vormgeving.',
  ],
}
