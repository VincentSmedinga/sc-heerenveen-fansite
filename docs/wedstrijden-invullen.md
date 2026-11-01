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
  Op de pagina van de wedstrijd staat dan "Wikipedia zegt iets anders", met wat Wikipedia zegt.
  Tot er een besluit is (dat volgt in #577), blijft jouw invoer staan tot je hem weghaalt.

De uitslag en de doelpunten tellen apart.
Wikipedia zet meestal eerst de uitslag, en pas later de doelpuntenmakers.

## Invoer weghalen

Op de pagina van de wedstrijd, onder het formulier, staat "Invoer weghalen".
Dat zet wat jij invulde terug naar wat er stond voor de eerste invoer, en vraagt een reden.
Daarna leest de import weer wat Wikipedia zegt, zoals bij elke andere wedstrijd.

Een onderdeel dat Wikipedia al had overgenomen, blijft zoals het is.

## Het logboek

Elke invoer, elk weghalen en elke keer dat de import iets doet met jouw invoer komt in het logboek (`audit_log`), met wie of "de import", wat en waarom.
Er is nog geen scherm om het te lezen; zie de [README van het databasepakket](../packages/db/README.md).
