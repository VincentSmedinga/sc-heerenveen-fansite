# Een wedstrijd invullen of verbeteren

Voor beheerders.
Soms heeft Wikipedia de uitslag nog niet, of staat er een fout in.
Een dag na een wedstrijd zeggen onze pagina's dan nog "Gegevens nog niet beschikbaar".
Op `/beheer/wedstrijden` vul je de wedstrijd zelf in, en iedereen ziet het meteen.

## Invullen

1. Open `/beheer/wedstrijden`.
   De wedstrijden zonder uitslag, twee uur na de aftrap, staan bovenaan.
2. Kies de wedstrijd.
   De naam van de koppeling zegt welke het is.
3. Vul in wat je weet.
   Je hoeft niet alles in te vullen:
   - de **aftrap**: de datum en de tijd, of de datum en een tekst als de tijd nog niet bekend is (zoals "12-14 februari 2027");
   - de **status**: gepland, gespeeld of uitgesteld;
   - de **uitslag**, bij een gespeelde wedstrijd.
     Bij de beker en de play-offs ook de verlenging, de stand na 90 minuten en de strafschoppen;
   - de **doelpunten**: per doelpunt het team dat het krijgt, de minuut met eventueel blessuretijd, de soort (gewoon, strafschop of eigen doelpunt) en de speler.
     Een speler van sc Heerenveen kies je uit de selectie.
     Maakte een speler van de tegenstander het doelpunt, kies dan "Andere speler" en schrijf zijn naam zoals Wikipedia hem schrijft.
4. Schrijf bij "Reden" waarom je dit invult.
   Dat is verplicht, en het komt in het logboek.
5. Kies "Opslaan".

De doelpunten moeten samen de uitslag geven.
Een uitslag zonder doelpunten mag: voeg ze toe als je ze weet.
De stand komt van Wikipedia en verandert niet mee, dus hij loopt achter tot Wikipedia de uitslag heeft.

## Wat de bezoeker ziet

De waarden die je invult, op de plekken waar de waarden van Wikipedia staan.
"Gegevens nog niet beschikbaar" verdwijnt bij een wedstrijd met uitslag.
Zolang minstens één wedstrijd van de redactie is, staat onder de bronvermelding van Wikipedia: "Enkele gegevens heeft onze redactie zelf ingevuld of aangepast."

## Wat de import doet

De import leest Wikipedia elk uur, en kijkt voor elk onderdeel dat jij invulde (de aftrap, de uitslag en de doelpunten, elk apart):

- **Wikipedia heeft nog niets:** jouw invoer blijft staan.
  Je hoeft niets te doen.
- **Wikipedia heeft hetzelfde:** de wedstrijd is niet meer van de redactie, en het onderdeel volgt Wikipedia.
  "Aangepast door de redactie" verdwijnt als alle onderdelen zo zijn overgenomen.
  Het logboek zegt dat Wikipedia is bijgekomen.
- **Wikipedia zegt iets anders:** jouw invoer blijft staan.
  De import schrijft het verschil één keer op, met beide waarden, in het logboek en in de waarschuwing van de import (`pnpm run import:status`).
  De beheerders krijgen een mail, en op `/beheer/wedstrijden` staat bij de wedstrijd "Wikipedia wijkt af".
  De startpagina van het beheer zegt hoeveel afwijkingen op een besluit wachten.

De uitslag en de doelpunten tellen apart.
Wikipedia zet meestal eerst de uitslag, en pas later de doelpuntenmakers.

## Een afwijking beslissen

Open de wedstrijd met "Wikipedia wijkt af".
Per onderdeel dat afwijkt, staan onze invoer en wat Wikipedia zegt naast elkaar.
Schrijf bij "Reden" waarom je beslist, en kies:

- **Neem Wikipedia over:** het onderdeel wordt wat Wikipedia zegt en volgt Wikipedia weer.
  "Aangepast door de redactie" verdwijnt als er geen onderdeel van jullie meer over is.
- **Houd onze invoer:** jullie invoer blijft staan.
  De import meldt dit verschil niet nog eens, tenzij Wikipedia iets anders gaat zeggen.

Het besluit komt in het logboek, met wie en waarom.
Beslist niemand, dan neemt de import het onderdeel over na zeven dagen, als Wikipedia dan nog hetzelfde zegt.
De beheerders krijgen daarover een mail.
Zet Wikipedia zelf de waarde van de redactie terug, dan vervalt de afwijking.

Wie op de server werkt, kan hetzelfde met `pnpm run import:changes`: `accept` neemt Wikipedia over, `reject` houdt de invoer.

## Invoer weghalen

Op de pagina van de wedstrijd, onder het formulier, staat "Invoer weghalen".
Dat zet wat jij invulde terug naar wat er stond voor de eerste invoer, en vraagt een reden.
Daarna leest de import weer wat Wikipedia zegt, zoals bij elke andere wedstrijd.
Een afwijking die nog wachtte, vervalt.

Een onderdeel dat Wikipedia al had overgenomen, blijft zoals het is.

## Het logboek

Elke invoer, elk weghalen en elke keer dat de import iets doet met jouw invoer komt in het logboek (`audit_log`), met wie of "de import", wat en waarom.
Er is nog geen scherm om het te lezen; zie de [README van het databasepakket](../packages/db/README.md).
