# Acceptatieomgeving

De acceptatieomgeving staat op <https://acc.sc.heerenveen.org>.
Het is een tweede website op de gedeelde hosting van mijn.host, naast het forum.
Elke merge naar `main` zet er een nieuwe versie van de site op.
Zo kijkt de groep een versie na voordat hij live gaat (productie komt met #33).

Dit bestand zegt hoe dat werkt, wat de eigenaar eenmalig zelf instelt, en hoe je controleert dat het klopt.

## Zo werkt het

De workflow [`acceptance.yml`](../.github/workflows/acceptance.yml) doet bij elke merge naar `main` vijf dingen:

1. Hij bouwt de site (`pnpm --filter site build`) en zet het resultaat in één map (`pnpm --filter site assemble`), met de migraties erbij.
2. Hij start die map zoals de host dat doet en controleert wat een bezoeker en een zoekmachine krijgen (`pnpm --filter site smoke`).
   Daarvoor start de workflow een eigen MariaDB die na de run weer weg is.
   De rooktest maakt daarop lege databases, en de site maakt er zelf de tabellen en de testbronnen in.
   Ook als de database niet bereikbaar is, controleert hij dat de homepage werkt en `/bronnen` de foutpagina toont.
3. Hij kopieert de map met rsync over SSH, op poort 26, naar de map van de app op de host.
4. Hij raakt `tmp/restart.txt` aan, zodat de host de app opnieuw start.
5. Hij vraagt <https://acc.sc.heerenveen.org/bronnen> op, tot een minuut lang.
   Hij faalt als de pagina niet met 200 antwoordt of geen testbron toont.
   Zo geeft een migratie die op de host mislukt, een rode run.

Op de server bouwen we niets.
De map bevat de standalone build van Next.js met zijn eigen `node_modules`, zonder symbolische links.
Waarom dat zo is, staat onder _Wat de eerste deploy ons leerde_.

Ontbreekt een van de geheimen hieronder, dan doet de workflow alleen stap 1 en 2 en meldt dat het kopiëren is overgeslagen.
Stap 5 vervalt dan ook.
`main` wordt er niet rood van.

De site leest bij het opstarten de variabelen `SITE_ENV` en `DATABASE_URL`.
Op acceptatie is `SITE_ENV` `acceptance`.
Dan krijgt elk antwoord de header `X-Robots-Tag: noindex, nofollow`, en weigert `/robots.txt` alles.
`DATABASE_URL` wijst naar de database van acceptatie (stap 3 hieronder).
Zonder een van de twee start de site niet.

## Het schema en de testbronnen

De site zet de database zelf klaar als de host hem start.
Dat gebeurt in `register()` in `apps/site/src/instrumentation.ts`, en de site beantwoordt pas daarna verzoeken:

1. Hij draait de migraties die de database nog niet had.
   `assemble` zet ze in `packages/db/drizzle` van de map, twee mappen boven `apps/site`, want Next.js neemt de SQL-bestanden zelf niet mee.
2. Alleen met `SITE_ENV=acceptance` zet hij daarna de testbronnen uit de seed in het register.
   Met `local` en `production` doet hij dat niet.
   Een testbron die er al staat, werkt hij bij op zijn domein, dus er komen geen dubbele.

Een slot in de database (`GET_LOCK`) zorgt dat twee processen die tegelijk starten, om de beurt migreren.
Het proces dat wacht, geeft na 30 seconden op en schrijft dat in het logboek.
Op een lege database maakt dit de tabellen.
Een nieuwe versie met een nieuwe migratie voegt die toe zodra de host hem start.

Lukt het niet, dan blijft de site draaien.
De homepage werkt dan nog.
Een pagina die de database nodig heeft, zoals `/bronnen`, toont de foutpagina "Er ging iets mis".
Het logboek zegt wat er misging (zie _Als het niet werkt_).
Lees het in _Setup Node.js App_ of in `stderr.log` in de map van de app.

`pnpm db:seed` op je eigen computer weigert als `SITE_ENV` `production` is.

## Eenmalig instellen

De eigenaar doet dit zelf, in DirectAdmin en in GitHub.
Een agent heeft daar geen toegang.

1. **Subdomein.**
   Maak in DirectAdmin onder het domein `sc.heerenveen.org` het subdomein `acc` aan, dus `acc.sc.heerenveen.org`.
   Kies bij _Document Root_ de standaardmap (`/domains/acc.sc.heerenveen.org/public_html`).
   Vraag daarna een certificaat aan (Let's Encrypt), zonder wildcard.
   Let's Encrypt controleert zo via HTTP of het domein van jou is.
   Een wildcard-certificaat (`*.sc.heerenveen.org`) vraagt een controle via DNS, en die mislukte: de naamservers van mijn.host toonden de TXT-record voor de controle niet.
   Zonder certificaat geeft `https://acc.sc.heerenveen.org` een certificaatfout.
2. **Node.js-app.**
   Maak in DirectAdmin onder _Setup Node.js App_ een app:
   - Node.js-versie: 24.
   - Modus: Production.
   - Map van de app (_Application root_): een map buiten `public_html`, bijvoorbeeld `domains/acc.sc.heerenveen.org/app`.
     Het pad van deze map is straks `DEPLOY_PATH`.
   - Adres van de app (_Application URL_): `acc.sc.heerenveen.org`.
   - Startbestand (_Application startup file_): `apps/site/server.js`.
   - Omgevingsvariabelen: `SITE_ENV` met de waarde `acceptance`, en `DATABASE_URL` met de database uit stap 3, als `mysql://gebruiker:wachtwoord@localhost:3306/database`.
   - Kies **niet** _Run NPM Install_: de build brengt zijn eigen `node_modules` mee.
     Staat er in de map van de app al een `node_modules` die een symbolische link is, verwijder die link dan.

   Verwijder daarna het bestand `domains/acc.sc.heerenveen.org/public_html/index.html`.
   Dat is de plaatsvervangende pagina van mijn.host.
   Zolang hij er staat, toont `https://acc.sc.heerenveen.org` die pagina in plaats van de site.

3. **Database.**
   Maak onder _MySQL Management_ een lege database met een eigen gebruiker voor acceptatie.
   Bewaar de gegevens in je wachtwoordmanager.
   De site leest de bronnen voor `/bronnen` uit deze database.
   De gegevens komen nooit in GitHub of in de repository.
   De tabellen en de testbronnen zet de site er zelf in als de host hem start (zie _Het schema en de testbronnen_).
4. **SSH-sleutel voor de deploys.**
   Maak een sleutel die alleen hiervoor dient, zonder wachtwoord (de workflow kan er geen invullen):

   ```sh
   ssh-keygen -t ed25519 -N '' -C 'fansite acceptatie deploy' -f ~/.ssh/fansite-acceptatie
   ```

   Zet de publieke sleutel (`fansite-acceptatie.pub`) in DirectAdmin bij de SSH-sleutels van het account.
   Controleer dat inloggen werkt: `ssh -p 26 -i ~/.ssh/fansite-acceptatie <gebruiker>@<host>`.

5. **Hostsleutel.**
   De workflow vertrouwt alleen de host die je hier vastlegt.
   Haal de sleutel op met `ssh-keyscan -p 26 <host>` en vergelijk de vingerafdruk met die van mijn.host.
6. **GitHub.**
   Maak onder _Settings → Environments_ de omgeving `acceptatie` aan en beperk _Deployment branches_ tot `main`.
   Voeg deze geheimen toe aan die omgeving:

   | Geheim            | Wat erin staat                                                     |
   | ----------------- | ------------------------------------------------------------------ |
   | `SSH_PRIVATE_KEY` | De hele inhoud van `~/.ssh/fansite-acceptatie`                     |
   | `SSH_KNOWN_HOSTS` | De uitvoer van `ssh-keyscan -p 26 <host>`                          |
   | `SSH_HOST`        | De hostnaam van de SSH-server                                      |
   | `SSH_USER`        | De gebruikersnaam voor SSH, dezelfde als die van DirectAdmin       |
   | `DEPLOY_PATH`     | Het volledige pad van de map van de app, zonder slash aan het eind |

7. **Eerste deploy.**
   Start de workflow met _Actions → Acceptance → Run workflow_, of voeg een wijziging samen met `main`.

## Controleren

- De pagina op <https://acc.sc.heerenveen.org> laat "sc Heerenveen Fansite" en "Binnenkort meer." zien.
- `curl -I https://acc.sc.heerenveen.org` toont `x-robots-tag: noindex, nofollow`.
  Die header staat ook bij `/robots.txt` en bij een pagina die niet bestaat.
- <https://acc.sc.heerenveen.org/robots.txt> toont `Disallow: /`.
- <https://acc.sc.heerenveen.org/bestaat-niet> toont de Nederlandse 404-pagina "Pagina niet gevonden".
- <https://acc.sc.heerenveen.org/bronnen> toont "Onze bronnen" met de testbronnen, zoals Testkrant.
  Toont hij "Er ging iets mis", dan kan de site de database niet lezen: kijk in het logboek.

## Als het niet werkt

- De workflow meldt "Deploy skipped": een geheim ontbreekt.
  De melding noemt welk.
- De site start niet: kijk in het logboek van de app (_Setup Node.js App_ of het bestand `stderr.log` in de map van de app).
  Een ontbrekende of verkeerde `SITE_ENV` of `DATABASE_URL` staat daar met naam bij.
- De workflow is rood bij _Check the sources page on acceptance_, of `/bronnen` toont "Er ging iets mis": de database is niet klaar.
  Het logboek heeft dan een regel die begint met `Could not bring the database up to date`, met de reden erachter:

  | Reden in het logboek                              | Wat je doet                                                                                                                                                        |
  | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | `connect ECONNREFUSED` of `getaddrinfo ENOTFOUND` | De database is niet bereikbaar. Controleer de host en de poort in `DATABASE_URL`.                                                                                  |
  | `Access denied for user`                          | De gebruiker of het wachtwoord in `DATABASE_URL` klopt niet.                                                                                                       |
  | `Unknown database`                                | De database bestaat niet. Maak hem aan onder _MySQL Management_.                                                                                                   |
  | `Could not get the lock`                          | Een ander proces migreert nog. Raak `tmp/restart.txt` aan om de app opnieuw te starten.                                                                            |
  | `Failed query` met een SQL-fout erachter          | Een migratie of de seed faalde. De fout noemt waarom. Een migratie die halverwege faalt, kan tabellen half hebben veranderd; kijk dan in de database wat er staat. |

  Is de database weer in orde, start de app dan opnieuw (raak `tmp/restart.txt` aan).
  De site probeert de migraties alleen bij het starten.

- Een bezoeker kreeg "Er ging iets mis" op `/bronnen`, terwijl de start goed ging: de regel `Could not read the sources for /bronnen` in het logboek noemt de reden.
  De database was dan waarschijnlijk even niet bereikbaar.
  Een mislukte vraag bewaart de site niet, dus de volgende bezoeker krijgt het opnieuw geprobeerd.
- De site geeft een 500 en `stderr.log` zegt `Cannot find module '@swc/helpers/...'`: de map op de host bevat symbolische links.
  `pnpm --filter site assemble` haalt ze weg en stopt als er een overblijft.
  Controleer de map op de host met `find <map van de app> -type l`; die opdracht mag niets tonen.

## Wat de eerste deploy ons leerde

We hadden bij het bouwen geen toegang tot de hosting.
De eerste deploy, op 21 oktober 2026, liet zien hoe die werkt:

- De host start de app met `lsnode.js` van LiteSpeed, niet met Passenger zelf, op Node 24.20 en zonder bijzondere opties.
  `apps/site/server.js` is een ES-module en laadt zonder omweg.
- Op de host staat rsync (`/usr/bin/rsync`).
  Met `--delete` en de uitzonderingen in de workflow bleven `tmp/` en `stderr.log` staan.
- De app start opnieuw zodra iemand `tmp/restart.txt` aanraakt.
- Een map met symbolische links, zoals pnpm ze maakt, werkte niet.
  Node laadt op de host één bestand van Next.js via het pad van de link, en zoekt de pakketten naast Next.js dan op de verkeerde plek.
  Lokaal en in CI gebeurt dat niet, dus de rooktest zag het niet.
  Waarom Node dat op de host doet, is niet uitgezocht.
  `assemble` maakt daarom een platte `node_modules` van echte mappen (zie `docs/beslissingen.md`).
- Een bestand in `public_html` gaat voor de app.
  De plaatsvervangende pagina `index.html` verborg daarom de site op `/`, tot we hem verwijderden.

## Productie

Productie komt met #33, met een eigen omgeving in GitHub en een eigen app op de hosting.
Die app krijgt `SITE_ENV=production`; zonder die waarde blijft de site uit de zoekmachines.
