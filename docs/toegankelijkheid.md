# Toegankelijkheid

De site voldoet aan WCAG 2.2, niveau AA.
Automatische controles met axe vangen veel, maar niet alles.
Deze checklist dekt wat een mens of de reviewer zelf nakijkt, bij elke pull request die iets zichtbaars verandert.
De nummers tussen haakjes zijn de succescriteria van WCAG.

## Waar je controleert

Er is geen preview per pull request, want de gedeelde hosting heeft daar geen ruimte voor.
Controleer daarom op de gerenderde pagina, in licht en donker:

- **In Storybook:** lokaal met `pnpm --filter design-system storybook`, of in de statische build van `pnpm --filter design-system build-storybook`.
  CI maakt die build ook bij elke pull request; hij staat als artifact `github-pages` bij de run van de workflow Storybook.
  De themaknop wisselt tussen licht en donker.
- **Op de site:** lokaal met `pnpm --filter site dev`.
  Zet `SITE_ENV=local` in de `.env` in de root.
  Met `data-theme="light"` of `data-theme="dark"` op het `html`-element kies je een thema.

## Wat CI controleert, en wat niet

- **De pagina's:** CI start de gebouwde site en toetst elke pagina uit de lijst in `apps/site/e2e/pages.spec.ts` met axe, in Chromium, in licht en donker.
  axe toetst op WCAG 2.0, 2.1 en 2.2, niveau A en AA, en op de best practices van axe.
  Elke schending laat de controle falen.
  Per pagina controleert de test ook precies één `h1`, `lang="nl"`, geen verzoek naar een ander domein en geen horizontale scrollbalk in een venster van 320 pixels breed.
  De homepage toetst hij met verzonnen koppen, die de test zelf in de database zet en daarna weghaalt.
  Lokaal draai je dit met `pnpm test:a11y`; wat eerst moet draaien, staat in de [README van de site](../apps/site/README.md).
- **De stories:** CI bouwt Storybook, maar toetst de stories niet met axe.
  In Storybook toont het paneel Toegankelijkheid voor elk verhaal wat axe vindt.
  Een component toetst CI dus alleen op de pagina's waar hij staat.
- **Een mens, straks:** de bediening met het toetsenbord, de volgorde van de focus, schermlezers en de laatste ronde WCAG-controle (#25).
  De verklaring op `/toegankelijkheid` belooft alleen wat is nagekeken.
  Bij elke ronde van een mens en bij elk gevonden of opgelost probleem werkt de maker van die wijziging de verklaring bij, in dezelfde pull request.

axe vindt onder meer: afbeeldingen zonder alt-tekst, velden zonder label, links en knoppen zonder naam, een pagina zonder `lang`, te weinig contrast bij tekst op een effen achtergrond, en ongeldige ARIA.

axe vindt niet of de volgorde van de focus logisch is, of de focus zichtbaar blijft, of een alt-tekst of linktekst iets zegt, of de koppen de inhoud volgen, of een foutmelding helpt, of het contrast klopt bij hover, focus en op een afbeelding, en of de pagina werkt bij 400% zoom of met minder beweging.
Daarvoor is de checklist hieronder.

## Checklist

### Toetsenbord en zichtbare focus

- [ ] Alles wat met de muis kan, kan ook met het toetsenbord: Tab, Shift+Tab, Enter, spatie, de pijltjes in een keuzelijst en Escape om iets te sluiten (2.1.1).
- [ ] De focus volgt de leesvolgorde en blijft nergens hangen (2.1.2, 2.4.3).
- [ ] Je ziet steeds waar de focus is: de focusrand van het designsysteem, niet weggehaald met `outline: none` (2.4.7).
      Hij haalt 3:1 tegen de achtergrond (1.4.11).
- [ ] Een vaste header of een melding bedekt het element met focus niet helemaal (2.4.11).
- [ ] Je kunt herhaalde blokken zoals het menu overslaan, met een link naar de inhoud of met landmarks: `header`, `nav`, `main` en `footer` (2.4.1).

Zo test je het: leg de muis weg en loop de pagina door met Tab.

### Kopstructuur

- [ ] Eén `h1` per pagina, die zegt waar de pagina over gaat.
- [ ] Geen overgeslagen niveaus: na een `h2` komt een `h2` of een `h3`, geen `h4` (1.3.1).
- [ ] Het niveau volgt de inhoud, niet het uiterlijk.
      Een kaarttitel kan een `h2` zijn die eruitziet als kop 3.
- [ ] Elke kop beschrijft wat eronder staat (2.4.6).

Zo test je het: bekijk de lijst met koppen in de toegankelijkheidsboom van je browser, of met de rotor van je schermlezer.

### Namen van links en knoppen

- [ ] Een link zegt waar hij heen gaat, ook los van de zin eromheen: geen "lees meer" of "klik hier" zonder meer (2.4.4).
      Bij een nieuwsbericht is de kop de link.
- [ ] Een knop zegt wat hij doet.
      Een knop met alleen een pictogram heeft een naam voor schermlezers, zoals `aria-label="Menu openen"`, en het pictogram zelf heeft `aria-hidden="true"` (4.1.2).
- [ ] De zichtbare tekst staat ook in die naam: een knop met "Zoeken" heet voor een schermlezer niet "Verstuur" (2.5.3).
- [ ] Een link gaat naar een andere plek, een knop doet iets op de pagina.
- [ ] Wat je kunt aanklikken, is minstens 24 bij 24 pixels, of heeft genoeg ruimte eromheen (2.5.8).
      Velden en knoppen van het designsysteem zijn 44 pixels hoog.

Zo test je het: tab door de pagina met een schermlezer aan, of bekijk de naam van elk element in de toegankelijkheidsboom.

### Formulieren en foutmeldingen

- [ ] Elk veld heeft een zichtbaar label, gekoppeld met `for` en `id`.
      Een placeholder is geen label (3.3.2).
- [ ] Velden voor persoonsgegevens hebben `autocomplete`, zoals `name` en `email` (1.3.5).
- [ ] Een fout staat in tekst bij het veld, zegt wat er mis is en hoe het wel moet, en is aan het veld gekoppeld met `aria-describedby`.
      Een rode rand alleen is niet genoeg (3.3.1, 3.3.3).
- [ ] Niemand hoeft iets twee keer in te vullen (3.3.7).
      Inloggen vraagt geen puzzel, en plakken en wachtwoordmanagers werken (3.3.8).

Zo test je het: verstuur het formulier leeg en met foute waarden, met alleen het toetsenbord.

### Contrast in licht en donker

- [ ] Tekst haalt minstens 4,5:1, grote tekst 3:1 (1.4.3).
      Bij ons haalt lopende tekst 7:1.
- [ ] Randen van velden, focusranden, pictogrammen en grafiekjes halen 3:1 (1.4.11).
- [ ] Dat geldt in beide thema's, en ook bij hover, focus en bezocht.
- [ ] Kleur is nooit het enige signaal: een fout heeft ook tekst, een link in een zin is onderstreept (1.4.1).

Zo test je het: Tokens/Kleur in Storybook toont het contrast van elk paar in beide thema's.
Gebruik de semantische tokens; een paar dat daar niet staat, meet je na met de contrastmeter in de ontwikkelhulpmiddelen van je browser.
Op de donkerblauwe header en wedstrijdband gelden eigen tokens voor de focusrand, die daar ook 3:1 halen.

### Inzoomen tot 400%

- [ ] Bij 400% zoom, in een venster van 1280 pixels breed, past alles zonder horizontaal te scrollen.
      Alleen een tabel, zoals de stand, mag opzij scrollen (1.4.10).
- [ ] Er valt geen tekst weg, niets komt over elkaar, en alles blijft bruikbaar (1.4.4).
- [ ] Meer regelafstand, letterafstand en woordafstand breekt niets (1.4.12).

Zo test je het: zoom in de browser tot 400%, of zet de responsieve weergave in de ontwikkelhulpmiddelen op 320 pixels breed.

### Minder beweging

- [ ] Met minder beweging aan (`prefers-reduced-motion: reduce`) staan animaties en vloeiend scrollen uit.
      Het designsysteem doet dat al voor vloeiend scrollen.
- [ ] Niets beweegt, scrolt of ververst langer dan vijf seconden vanzelf zonder dat je het kunt pauzeren (2.2.2).
- [ ] Niets knippert vaker dan drie keer per seconde (2.3.1).

Zo test je het: zet minder beweging aan in je besturingssysteem, of boots het na in de ontwikkelhulpmiddelen van je browser.

### De taal van de pagina

- [ ] Het `html`-element heeft `lang="nl"` (3.1.1).
- [ ] Een zin of passage in een andere taal krijgt een eigen `lang`, zoals `fy` voor een Friese zin of `en` voor een Engelse kop.
      Namen en losse woorden niet (3.1.2).

Zo test je het: zoek in de HTML naar `lang`, en luister of je schermlezer van uitspraak wisselt.

### Afbeeldingen

- [ ] Een foto of afbeelding met inhoud heeft een alt-tekst die zegt wat erop staat.
      Een versiering heeft `alt=""` (1.1.1).
      axe ziet of er een alt-tekst is, niet of hij klopt.

### De toegankelijkheidsverklaring

- [ ] Verandert de pull request wat we over de toegankelijkheid weten of beloven, zoals een gevonden of opgelost probleem of een ronde van een mens (#25)?
      Dan staat de bijgewerkte tekst en datum van `/toegankelijkheid` in dezelfde pull request.
- [ ] De verklaring belooft niet meer dan is nagekeken.

## In de review

Het verslag noemt bij toegankelijkheid per onderwerp wat er is gecontroleerd, en hoe: het verhaal of de pagina, de opdracht en de uitkomst.
Raakt een onderwerp de wijziging niet, dan staat er "niet van toepassing", met de reden.
Wat alleen een mens kan beoordelen, zoals het gedrag met een schermlezer, staat er als open punt voor de projecteigenaar.

## Patronen in Storybook

Het designsysteem lost veel van deze punten al op.
Gebruik wat er is, in plaats van het opnieuw te bouwen (#19):

- [Tokens/Kleur](https://vincentsmedinga.github.io/sc-heerenveen-fansite/?path=/docs/tokens-kleur--documentatie): elk kleurpaar met zijn contrast, in licht en donker.
- [HTML-elementen/Koppen](https://vincentsmedinga.github.io/sc-heerenveen-fansite/?path=/docs/html-elementen-koppen--documentatie): de stijl van een kop staat los van het niveau.
- [HTML-elementen/Links](https://vincentsmedinga.github.io/sc-heerenveen-fansite/?path=/docs/html-elementen-links--documentatie): onderstreepte links, met hover, focus en bezocht.
- [HTML-elementen/Formulier](https://vincentsmedinga.github.io/sc-heerenveen-fansite/?path=/docs/html-elementen-formulier--documentatie): labels, velden en knoppen van 44 pixels hoog, en randen van 3:1.
- [Componenten](https://vincentsmedinga.github.io/sc-heerenveen-fansite/?path=/docs/componenten-overzicht--documentatie): de componenten voor de paginaopbouw, met de landmarks `header`, `nav`, `main` en `footer`, een navigatie met een naam en een kop met een niveau los van zijn stijl.
- [Hulpklassen/Alleen voor schermlezers](https://vincentsmedinga.github.io/sc-heerenveen-fansite/?path=/docs/hulpklassen-alleen-voor-schermlezers--documentatie): de klasse `hf-visually-hidden`, voor tekst die je niet ziet maar die een schermlezer wel voorleest.

De patronen volgen met de pagina's die ze nodig hebben.
