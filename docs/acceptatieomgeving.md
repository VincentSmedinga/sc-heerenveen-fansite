# Acceptatieomgeving

De acceptatieomgeving staat op <https://acc.sc.heerenveen.org>.
Het is een tweede website op de gedeelde hosting van mijn.host, naast het forum.
Elke merge naar `main` zet er een nieuwe versie van de site op.
Zo kijkt de groep een versie na voordat hij live gaat (productie komt met #33).

Op de host haalt de importer elke 15 minuten de koppen op van de bronnen.
Dit bestand zegt hoe dat werkt, wat de eigenaar eenmalig zelf instelt, en hoe je controleert dat het klopt.

## Zo werkt het

De workflow [`acceptance.yml`](../.github/workflows/acceptance.yml) doet bij elke merge naar `main` zes dingen:

1. Hij bouwt de site (`pnpm --filter site build`) en zet het resultaat in één map (`pnpm --filter site assemble`), met de migraties en de importer erbij.
   De importer is één JavaScript-bestand, `apps/importer/import.mjs`, dat `esbuild` maakt.
2. Hij start die map zoals de host dat doet en controleert wat een bezoeker en een zoekmachine krijgen (`pnpm --filter site smoke`).
   Daarvoor start de workflow een eigen MariaDB die na de run weer weg is.
   De rooktest maakt daarop lege databases, en de site maakt er zelf de tabellen en de testbronnen in.
   Ook als de database niet bereikbaar is, controleert hij dat de homepage en `/bronnen` de foutpagina tonen.
3. Hij draait de importer één keer uit die map, op dezelfde MariaDB.
   De database krijgt de tabellen maar niet de seed, dus er zijn geen feeds en de importer vraagt geen echte site iets.
   Start de importer niet of bereikt hij de database niet, dan wordt de run rood.
4. Hij kopieert de map met rsync over SSH, op poort 26, naar de map van de app op de host.
5. Hij raakt `tmp/restart.txt` aan, zodat de host de app opnieuw start.
6. Hij vraagt <https://acc.sc.heerenveen.org/bronnen> op, tot een minuut lang.
   Hij faalt als de pagina niet met 200 antwoordt of geen testbron toont.
   Zo geeft een migratie die op de host mislukt, een rode run.

Op de server bouwen we niets.
De map bevat de standalone build van Next.js met zijn eigen `node_modules`, zonder symbolische links.
Waarom dat zo is, staat onder _Wat de eerste deploy ons leerde_.
De importer heeft geen `node_modules` nodig: alles wat hij gebruikt, zit in zijn ene bestand.

Ontbreekt een van de geheimen hieronder, dan doet de workflow alleen stap 1 tot en met 3 en meldt dat het kopiëren is overgeslagen.
Stap 6 vervalt dan ook.
`main` wordt er niet rood van.

De site leest bij het opstarten de variabelen `SITE_ENV` en `DATABASE_URL`, en de vijf van de mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` en `MAIL_FROM`.
Op acceptatie is `SITE_ENV` `acceptance`.
Dan krijgt elk antwoord de header `X-Robots-Tag: noindex, nofollow`, en weigert `/robots.txt` alles.
`DATABASE_URL` wijst naar de database van acceptatie (stap 3 hieronder), en de mailvariabelen naar de brievenbus van de redactie (stap 11).
Zonder een van deze start de site niet.

## Het schema en de testbronnen

De site zet de database zelf klaar als de host hem start.
Dat gebeurt in `register()` in `apps/site/src/instrumentation.ts`, en de site beantwoordt pas daarna verzoeken:

1. Hij draait de migraties die de database nog niet had.
   `assemble` zet ze in `packages/db/drizzle` van de map, twee mappen boven `apps/site`, want Next.js neemt de SQL-bestanden zelf niet mee.
2. Alleen met `SITE_ENV=acceptance` zet hij daarna de bronnen uit de seed in het register: de testbronnen, de echte nieuwsbronnen met hun feeds (zie [`bronnen.md`](bronnen.md)) en ons eigen forum.
   Met `local` en `production` doet hij dat niet.
   Een bron die er al staat, werkt hij bij op haar domein, dus er komen geen dubbele.

Een slot in de database (`GET_LOCK`) zorgt dat twee processen die tegelijk starten, om de beurt migreren.
Het proces dat wacht, geeft na 30 seconden op en schrijft dat in het logboek.
Op een lege database maakt dit de tabellen.
Een nieuwe versie met een nieuwe migratie voegt die toe zodra de host hem start.

Lukt het niet, dan blijft de site draaien.
Een pagina die de database nodig heeft, zoals de homepage en `/bronnen`, toont de foutpagina "Er ging iets mis".
Het logboek zegt wat er misging (zie _Als het niet werkt_).
Lees het in _Setup Node.js App_ of in `stderr.log` in de map van de app.

`pnpm db:seed` op je eigen computer weigert als `SITE_ENV` `production` is.

## De import

Cron start op de host elke 15 minuten de importer, `apps/importer/import.mjs` in de map van de app.
Hij leest de feeds van de bronnen die aanstaan, die uit de seed (zie [`bronnen.md`](bronnen.md)), en ons forum.
De koppen komen in de tabel `items`.
Van het forum leest hij als gast de API, en de vijf nieuwste discussies komen in de tabel `discussions`.
Die vervangt hij bij elke run, dus de tabel houdt geen geschiedenis.
De host moet `https://forum.heerenveen.org` kunnen bereiken; dat is het openbare adres, ook al staat het forum op dezelfde hosting.
Wat hij per feed schrijft, staat in de [README van de importer](../apps/importer/README.md).

- Cron start hem op minuut 7, 22, 37 en 52 van elk uur, niet op het hele kwartier: dan starten veel andere cronjobs.
- Een cronjob krijgt de variabelen van de Node.js-app niet.
  De importer leest `DATABASE_URL` daarom uit een eigen bestand in de thuismap, `~/fansite-acceptatie.env`, met `node --env-file`.
- De uitvoer komt achteraan in `~/fansite-import.log`, met de tijd van de run ervoor.
  Er gaat geen e-mail.
  Niets ruimt dat bestand op; het groeit met een paar regels per run.
- De importer weigert adressen die niet op het openbare internet liggen, zoals `localhost` of `10.0.0.1`, ook na een doorverwijzing.
- Een run neemt een lock in de database, dus er draaien nooit twee runs tegelijk.
  Vindt een run de lock bezet, dan stopt hij meteen.
- Elke run komt in het logboek in de database, met per feed wat er gebeurde.
  Daaruit volgt de gezondheid van elke feed: na drie mislukte runs op rij is een feed ongezond.
  Het overzicht daarvan vraag je op met SSH (zie _Controleren_).
- Vraagt een bron om te wachten, of faalt een feed drie runs op rij, dan slaat de import de feed een tijd over.
  Hoe lang, staat in de [README van de importer](../apps/importer/README.md).

Elke deploy kopieert de importer samen met de site.
Zo past hij bij het schema, dat de site bijwerkt als de host haar start.

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
   - Omgevingsvariabelen: `SITE_ENV` met de waarde `acceptance`, `DATABASE_URL` met de database uit stap 3, als `mysql://gebruiker:wachtwoord@localhost:3306/database`, en de vijf variabelen voor de mail uit stap 11.
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

De import vraagt nog drie stappen op de host.
Log daarvoor in met SSH: `ssh -p 26 <gebruiker>@<host>`.

8. **Het bestand met `DATABASE_URL` voor de import.**
   Maak in de thuismap een bestand dat alleen jouw account mag lezen en schrijven:

   ```sh
   touch ~/fansite-acceptatie.env
   chmod 600 ~/fansite-acceptatie.env
   ```

   Open het met een editor, zoals `nano` of `vi`, en zet er één regel in, met dezelfde waarde als bij de Node.js-app (stap 2):

   ```sh
   DATABASE_URL=mysql://gebruiker:wachtwoord@localhost:3306/database
   ```

   Gebruik geen `echo`: dan komt het wachtwoord in de geschiedenis van je shell.
   `ls -l ~/fansite-acceptatie.env` moet beginnen met `-rw-------`.
   Het bestand staat buiten de map van de app en buiten `public_html`, dus de deploy raakt het niet aan en een bezoeker kan het niet opvragen.
   Het wachtwoord staat nu op twee plekken op de host.
   Verander je het, pas het dan hier en bij de Node.js-app aan.

9. **Het pad van Node 24.**
   Cron weet niet waar Node 24 staat, dus de opdracht noemt het volledige pad.
   Op mijn.host is dat `/opt/alt/alt-nodejs24/root/usr/bin/node`.
   Dat is bevestigd op 23 oktober 2026: de importer draaide er met Node v24.22.1.
   Verandert het pad ooit, dan laten deze opdrachten het zien:

   ```sh
   ls -d /opt/alt/alt-nodejs*/root/usr/bin/node
   /opt/alt/alt-nodejs24/root/usr/bin/node --version
   ```

   De eerste opdracht toont de versies die er zijn.
   De tweede moet een versie tonen die met `v24.` begint.
   Staat Node 24 daar niet, kopieer dan in _Setup Node.js App_ de opdracht bovenaan de app, die met `source` begint.
   Draai die met SSH, en daarna `readlink -f "$(command -v node)"`: dat toont het pad voor stap 10.

10. **De cronjob.**
    Open in DirectAdmin _Advanced Features → Cron Jobs_ en maak een cronjob:
    - Minuut: `7,22,37,52`.
    - Uur, dag van de maand, maand en dag van de week: `*`.
    - Opdracht, op één regel:

      ```sh
      (date; /opt/alt/alt-nodejs24/root/usr/bin/node --env-file=/home/<gebruiker>/fansite-acceptatie.env /home/<gebruiker>/domains/acc.sc.heerenveen.org/app/apps/importer/import.mjs) >> /home/<gebruiker>/fansite-import.log 2>&1
      ```

    Vervang `<gebruiker>` door je gebruikersnaam.
    Heet de map van de app anders, gebruik dan `DEPLOY_PATH` uit stap 6 in plaats van `/home/<gebruiker>/domains/acc.sc.heerenveen.org/app`.
    Is het pad van Node veranderd, gebruik dan het pad dat stap 9 laat zien.
    Laat het e-mailadres voor de uitvoer van cron leeg.
    De opdracht schrijft alles in het logbestand, dus er is ook niets om te mailen.

11. **Mail.**
    De site mailt via de mailserver van de hosting, vanaf de brievenbus `fansite@heerenveen.org` (zie `sendMail` in `apps/site/src/mail.ts`).
    Het contactformulier en het inloggen voor het beheer gebruiken dat later.
    Zet bij de omgevingsvariabelen van de Node.js-app (stap 2) deze vijf, **voordat** je de versie met `sendMail` samenvoegt: zonder deze vijf start de site niet, en de workflow wordt rood bij stap 6.

    | Variabele       | Wat erin staat                                                                                                                                       |
    | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `SMTP_HOST`     | De naam van de mailserver, zoals DirectAdmin die toont bij het e-mailaccount, zonder `smtps://` of poort. Vaak `mail.heerenveen.org`                 |
    | `SMTP_PORT`     | `465` (TLS vanaf het begin). Een andere poort, zoals `587`, werkt ook, als de server daar STARTTLS kent: de site mailt nooit zonder TLS              |
    | `SMTP_USER`     | De naam om in te loggen: het hele adres, `fansite@heerenveen.org`                                                                                    |
    | `SMTP_PASSWORD` | Het wachtwoord van de brievenbus                                                                                                                     |
    | `MAIL_FROM`     | De afzender, bijvoorbeeld `sc Heerenveen Fansite <fansite@heerenveen.org>`. Veel hostingservers weigeren een afzender die niet bij `SMTP_USER` hoort |

    Het wachtwoord is dat van de brievenbus die de redactie ook leest.
    Kan mijn.host een apart SMTP-wachtwoord of een tweede brievenbus maken, dan is dat veiliger; de code verandert daar niet door.
    Het wachtwoord staat nooit in GitHub of in de repository.
    Draai daarna de proefmail onder _Controleren_.

12. **Accounts voor het beheer.**
    Wie het beheer in mag, heeft een persoonlijk account met een e-mailadres en een rol: `beheerder` of `moderator`.
    Er is geen aanmeldpagina en geen wachtwoord.
    Je maakt een account met een opdracht op de host, en de persoon logt in met een link die de site mailt (zie _Het beheer_ hieronder).
    De tabellen komen vanzelf: de site maakt ze als de host hem start, net als de rest van het schema.
    Het bestand `apps/site/admin.mjs` staat sinds de deploy op de host, naast de importer.
    Het is één bestand, en het leest alleen `DATABASE_URL`, uit hetzelfde bestand als de importer (`~/fansite-acceptatie.env`, stap 8).
    Log in met SSH (`ssh -p 26 <gebruiker>@<host>`) en draai op één regel, met het adres en de rol erachter:

    ```sh
    /opt/alt/alt-nodejs24/root/usr/bin/node --env-file=/home/<gebruiker>/fansite-acceptatie.env /home/<gebruiker>/domains/acc.sc.heerenveen.org/app/apps/site/admin.mjs create <e-mailadres> beheerder
    ```

    Gebruik dezelfde paden als in de cronjob (stap 9 en 10).
    Hij zegt `Made the account for <adres>, as beheerder.` en stopt met 0.
    Het adres wordt in kleine letters bewaard.
    Heeft het adres al een account dat aanstaat, dan zegt hij dat en verandert hij niets (stopt met 1).
    Staat het account uit, dan zet dezelfde opdracht het weer aan, met de rol die je noemt.

    Een account uitzetten, en zijn sessies meteen beëindigen, doe je met `revoke`:

    ```sh
    /opt/alt/alt-nodejs24/root/usr/bin/node --env-file=/home/<gebruiker>/fansite-acceptatie.env /home/<gebruiker>/domains/acc.sc.heerenveen.org/app/apps/site/admin.mjs revoke <e-mailadres>
    ```

    Hij zegt `Turned off the account for <adres> and ended <n> sessions.`
    De persoon is dan meteen uitgelogd en krijgt geen nieuwe link meer.
    Een adres zonder account geeft `There is no account for <adres>.` en code 1.
    Een fout in de opdracht, zoals een rol die niet bestaat, toont het gebruik en stopt met 2.

    Op je eigen computer, met pnpm, doe je hetzelfde met `pnpm admin:create <e-mailadres> <rol>` en `pnpm admin:revoke <e-mailadres>`.
    Dat leest `DATABASE_URL` uit de `.env` in de root.

## Het beheer

De pagina's onder `/beheer` zijn voor de redactie.
`/beheer/inloggen` vraagt een e-mailadres.
Heeft het adres een account dat aanstaat, dan mailt de site (met `sendMail`, stap 11) een link naar `/beheer/inloggen/bevestigen`.
Het antwoord op het scherm is voor elk adres hetzelfde: "Als dit adres een account heeft, hebben we een link gemaild."
Zo kan niemand nagaan wie een account heeft.

- De link werkt 15 minuten en één keer.
  De pagina erachter logt niet zelf in, maar toont de knop Inloggen: een virusscanner of voorbeeldweergave die de link opent, gebruikt hem dan niet op.
- Per e-mailadres kun je 5 links per kwartier vragen, en de hele site 30.
  Daarna zegt de pagina dat er te veel links zijn gevraagd.
  De teller staat in de database en bewaart geen IP-adressen.
- Na het inloggen staat de sessie in de database, en de browser krijgt één cookie met alleen een nummer erin: `beheer-sessie`, met `HttpOnly`, `Secure` en `SameSite=Lax`, alleen voor de pagina's onder `/beheer`.
  Een sessie eindigt na 12 uur zonder gebruik, en na 7 dagen hoe dan ook.
  Uitloggen verwijdert de sessie op de server.
- Alles onder `/beheer` krijgt `X-Robots-Tag: noindex, nofollow` en `Cache-Control: no-store`, ook op productie, en `robots.txt` weigert `/beheer` op elke omgeving.
- Het beheer heeft twee schermen.
  `/beheer/artikelen` is voor een beheerder: daar schrijft, bekijkt, publiceert en trekt hij een artikel van de redactie in (zie [`artikelen.md`](artikelen.md)).
  `/beheer/berichten` is voor een beheerder of moderator, die er een bericht verbergt, met een reden, en het weer toont.
  Een verborgen bericht staat binnen vijf minuten niet meer op de homepage en op `/podcasts`, en de import zet het niet terug.
  De lijst toont ook de berichten die het relevantiefilter een twijfelgeval vond of niet over de club; die staan niet op de site (zie _Het relevantiefilter_ in de [README van de importer](../apps/importer/README.md)).
  Elke actie komt in het logboek, de tabel `audit_log`.
  Er is nog geen scherm om het logboek te lezen; lees het in phpMyAdmin:

  ```sql
  SELECT l.created_at, u.email, l.action, l.item_id, l.reason
  FROM audit_log l JOIN admin_users u ON u.id = l.user_id
  ORDER BY l.id DESC LIMIT 20
  ```

## Controleren

- De pagina op <https://acc.sc.heerenveen.org> laat "sc Heerenveen Fansite" in het logo zien, het blok "Laatste nieuws" en in de zijbalk het blok "Nieuwste discussies".
  Zolang de import op de host niet draait (zie _Eenmalig instellen_, stap 8 tot en met 10), staat er "We hebben nog geen nieuws gevonden. Kijk straks nog eens." en "We hebben nog geen discussies van het forum."
  Daarna staan er de tien nieuwste koppen van de echte nieuwsbronnen uit de seed, met onder de lijst de knop "Laad 5 meer" als er meer zijn.
  In het blok "Nieuwste discussies" staan dan de vijf discussies waar het laatst op is gereageerd, elk met het aantal reacties, de laatste reageerder en de tijd, en onderaan de link "Naar het forum".
  Controleer dat er geen discussie van Offtopics of Sport overig bij staat.
  Toont hij "Er ging iets mis", dan kan de site de database niet lezen: kijk in het logboek.
- `curl -I https://acc.sc.heerenveen.org` toont `x-robots-tag: noindex, nofollow`.
  Die header staat ook bij `/robots.txt` en bij een pagina die niet bestaat.
- <https://acc.sc.heerenveen.org/robots.txt> toont `Disallow: /` en `Disallow: /beheer`.
  Op productie toont hij alleen `Disallow: /beheer`, met de sitemap.
- <https://acc.sc.heerenveen.org/bestaat-niet> toont de Nederlandse 404-pagina "Pagina niet gevonden".
- <https://acc.sc.heerenveen.org/bronnen> toont "Onze bronnen" met de testbronnen, zoals Testkrant, de echte nieuwsbronnen uit de seed en onder Forum sc Heerenveen Forum.
  Toont hij "Er ging iets mis", dan kan de site de database niet lezen: kijk in het logboek.
- De import werkt als `tail -n 20 ~/fansite-import.log` na een kwartier een tijd toont, met een regel voor de feed eronder:

  ```text
  Thu Oct 22 14:07:01 CEST 2026
  https://www.lc.nl/sport/sc-heerenveen/rss/: 3 new, 0 updated, 47 unchanged, 0 skipped; 50 relevant, 0 doubtful, 0 irrelevant
  https://forum.heerenveen.org/api/discussions?sort=-lastPostedAt&page[limit]=30&include=lastPostedUser,tags: 1 new, 0 updated, 3 unchanged, 0 skipped
  ```

  Wil je niet wachten, draai dan de opdracht van de cronjob met SSH, zonder het deel vanaf `>>`.
  Dan zie je de uitvoer meteen.

- Het overzicht van de gezondheid krijg je met SSH.
  Draai hetzelfde bestand als de cronjob, met `--status` erachter, op één regel:

  ```sh
  /opt/alt/alt-nodejs24/root/usr/bin/node --env-file=/home/<gebruiker>/fansite-acceptatie.env /home/<gebruiker>/domains/acc.sc.heerenveen.org/app/apps/importer/import.mjs --status
  ```

  Gebruik dezelfde paden als in de cronjob (stap 9 en 10).
  Het overzicht toont de laatste run, en per feed de bron, het adres, de laatste geslaagde run, het aantal mislukte runs op rij, de laatste fout, en of de feed gezond is.
  Het verandert niets in de database.
  `echo $?` direct daarna toont 0 als elke feed gezond is, en 1 als een feed ongezond is.
  De README van de importer laat zien hoe het eruitziet.

- `curl -I https://acc.sc.heerenveen.org/beheer/inloggen` toont `x-robots-tag: noindex, nofollow`, `cache-control` met `no-store` erin en `referrer-policy: same-origin`.
  Een bezoeker zonder sessie die `/beheer` opvraagt, krijgt een doorverwijzing (307) naar `/beheer/inloggen`, met dezelfde headers.
- Het inloggen werkt als je na stap 12 (en na de proefmail) een account maakt voor je eigen adres, naar <https://acc.sc.heerenveen.org/beheer/inloggen> gaat, je adres invult, binnen een paar minuten de mail "Inloggen bij het beheer van de sc Heerenveen Fansite" krijgt en na de link en de knop Inloggen "Je bent ingelogd als <je adres>." ziet.
  De link werkt maar één keer: opnieuw openen zegt "Deze link werkt niet".
  Uitloggen brengt je terug bij het formulier, en met de terugknop kom je niet meer in het beheer.
  Het cookie `beheer-sessie` zie je in de ontwikkelaarstools van je browser, onder Application → Cookies; het is `HttpOnly` en `Secure`.
  De pagina met de knop Inloggen zegt eerst "Deze link klopt." en wat je nu doet.
- Een bericht verbergen werkt als je ingelogd bent en naar <https://acc.sc.heerenveen.org/beheer/berichten> gaat.
  Zoek een bericht op een deel van de kop of de link (`?q=`), vul bij "Reden" bijvoorbeeld "Fout in het bericht" in en kies Verberg.
  Zonder reden blijft het bericht staan en zegt de pagina wat er mis is.
  De pagina zegt "Staat binnen vijf minuten niet meer op de site"; na hoogstens vijf minuten staat het bericht niet meer op de homepage.
  Na de volgende import (hoogstens een kwartier later) is het nog steeds weg, ook als de bron het bericht opnieuw aanbiedt.
  "Toon weer" zet het terug, binnen vijf minuten.
  De vraag onder _Het beheer_ toont voor elke actie een regel in het logboek, met jouw adres, de tijd, `item.hide` of `item.show`, het nummer van het bericht en de reden.
  Een actie bij een artikel (`article.create`, `article.update`, `article.publish` of `article.unpublish`) heeft het nummer van het artikel en geen reden.
- De proefmail laat zien dat de site kan mailen.
  Het bestand `apps/site/send-test-mail.mjs` staat sinds de deploy op de host, naast de importer.
  Het leest de variabelen uit een bestand, net als de importer, en een cronjob of SSH-sessie krijgt die van de Node.js-app niet.
  Zet daarom, met een editor en niet met `echo` (zie stap 8), in `~/fansite-acceptatie.env` de regel `SITE_ENV=acceptance` en de vijf variabelen van stap 11, elk als `NAAM=waarde`.
  Het bestand mag alleen jouw account lezen (`chmod 600`).
  Het wachtwoord staat dan op drie plekken op de host; verander je het, pas het dan overal aan.
  Draai op één regel, met je eigen adres erachter:

  ```sh
  /opt/alt/alt-nodejs24/root/usr/bin/node --env-file=/home/<gebruiker>/fansite-acceptatie.env /home/<gebruiker>/domains/acc.sc.heerenveen.org/app/apps/site/send-test-mail.mjs <jouw adres>
  ```

  Gebruik dezelfde paden als in de cronjob (stap 9 en 10).
  Hij zegt "The mail server took the test mail".
  Binnen een paar minuten staat er een mail "Proefmail van de sc Heerenveen Fansite" in je brievenbus.
  Kijk ook in de map met ongewenste mail.
  Lukt het niet, dan zegt hij `Could not send the mail` met een code:
  - `ESOCKET` of `ECONNECTION`: de server is niet bereikbaar. Controleer `SMTP_HOST` en `SMTP_PORT`.
  - `EAUTH`: het wachtwoord of de gebruiker klopt niet.
  - `ETLS`: de server kent geen TLS op die poort.
  - `EENVELOPE`: de server weigerde de afzender of de ontvanger.

  Het logboek en de melding bevatten nooit het wachtwoord of het adres.

- In de database staan de koppen in de tabel `items`: `SELECT COUNT(*) FROM items` in phpMyAdmin telt ze.
  De discussies van het forum staan in de tabel `discussions`: dat zijn er na een run vijf.

## Als het niet werkt

- De workflow meldt "Deploy skipped": een geheim ontbreekt.
  De melding noemt welk.
- De site start niet: kijk in het logboek van de app (_Setup Node.js App_ of het bestand `stderr.log` in de map van de app).
  Een ontbrekende of verkeerde `SITE_ENV`, `DATABASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` of `MAIL_FROM` staat daar met naam bij.
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

- Een bezoeker kreeg "Er ging iets mis" op `/bronnen` of de homepage, terwijl de start goed ging: de regel `Could not read the sources for /bronnen` of `Could not read the headlines and discussions for the homepage` in het logboek noemt de reden.
  De database was dan waarschijnlijk even niet bereikbaar.
  Een mislukte vraag bewaart de site niet, dus de volgende bezoeker krijgt het opnieuw geprobeerd.
- De site geeft een 500 en `stderr.log` zegt `Cannot find module '@swc/helpers/...'`: de map op de host bevat symbolische links.
  `pnpm --filter site assemble` haalt ze weg en stopt als er een overblijft.
  Controleer de map op de host met `find <map van de app> -type l`; die opdracht mag niets tonen.
- De opdracht voor de accounts (`admin.mjs`) werkt niet: de fout staat op het scherm.

  | Wat er op het scherm staat                                  | Wat je doet                                                                                                                          |
  | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
  | `node: /home/<gebruiker>/fansite-acceptatie.env: not found` | Het bestand met `DATABASE_URL` ontbreekt of heet anders. Maak het zoals in stap 8.                                                   |
  | `DATABASE_URL is missing` of `DATABASE_URL: Invalid URL`    | Het bestand heeft geen regel `DATABASE_URL=…`, of de waarde klopt niet. Kopieer de waarde van de Node.js-app.                        |
  | `Access denied for user` of `connect ECONNREFUSED`          | De gebruiker, het wachtwoord of de host in het bestand klopt niet. Kopieer de waarde van de Node.js-app.                             |
  | `Table '…admin_users' doesn't exist`                        | De database heeft de tabellen van het beheer nog niet. De site maakt ze als de host haar start: open de site en probeer het opnieuw. |
  | Het gebruik (`Usage:`)                                      | De opdracht klopt niet: `create <e-mailadres> beheerder` (of `moderator`), of `revoke <e-mailadres>`.                                |

- Iemand krijgt geen mail met een link: de pagina antwoordt voor elk adres hetzelfde, dus kijk eerst of het adres een account heeft dat aanstaat (stap 12, in phpMyAdmin: `SELECT email, role, disabled_at FROM admin_users`).
  Staat het er goed, kijk dan in het logboek van de app naar een regel `Could not mail a login link`.
  De proefmail (zie _Controleren_) laat zien of de site kan mailen.
  Het adres staat niet in het logboek, dus de regel noemt alleen de soort fout.
- De import werkt niet: kijk in `~/fansite-import.log`.
  Elke run begint met de tijd.
  Komen er geen nieuwe tijden bij, dan start cron de opdracht niet: controleer de cronjob in DirectAdmin.
  Anders staat de reden onder de tijd:

  | Wat er in het logbestand staat                              | Wat je doet                                                                                                                                                          |
  | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Het pad van Node met `No such file or directory`            | Het pad van Node klopt niet. Zoek het op zoals in stap 9.                                                                                                            |
  | `node: /home/<gebruiker>/fansite-acceptatie.env: not found` | Het bestand met `DATABASE_URL` ontbreekt of heeft een andere naam. Maak het zoals in stap 8.                                                                         |
  | `Cannot find module` met het pad van `import.mjs`           | Het pad van de app in de opdracht klopt niet, of de deploy heeft de importer nog niet gekopieerd. Controleer het met `ls <map van de app>/apps/importer/import.mjs`. |
  | `DATABASE_URL is missing` of `DATABASE_URL: Invalid URL`    | Het bestand heeft geen regel `DATABASE_URL=…`, of de waarde is geen goede URL. Kopieer de waarde van de Node.js-app.                                                 |
  | `Access denied for user`                                    | De gebruiker of het wachtwoord in het bestand klopt niet. Kopieer de waarde van de Node.js-app; is het wachtwoord veranderd, pas het dan op beide plekken aan.       |
  | `connect ECONNREFUSED` of `getaddrinfo ENOTFOUND`           | De database is niet bereikbaar. Controleer de host en de poort in het bestand.                                                                                       |
  | `Table '…' doesn't exist`, zoals `…feeds` of `…import_runs` | De database heeft de tabellen nog niet. De site maakt ze als de host haar start: open <https://acc.sc.heerenveen.org> en wacht op de volgende run.                   |
  | Een regel met `failed,` achter het adres van een feed       | De importer startte, maar las die feed niet. De reden staat erachter; de volgende run probeert het opnieuw.                                                          |
  | Een regel met `runs in a row; next try from`                | De feed is ongezond, en de import probeert hem eens per uur. De reden van de fouten staat in het overzicht (`--status`) en in eerdere regels van het logbestand.     |
  | `Another import is still running` bij elke run              | Een run blijft hangen en houdt de lock vast. Zoek het proces met `ps -u <gebruiker> -f`, de regel met `import.mjs`, en stop het met `kill` en het nummer ervan.      |

## Wat de eerste deploy ons leerde

We hadden bij het bouwen geen toegang tot de hosting.
De eerste deploy, op 21 oktober 2026, en de eerste run van de importer, op 23 oktober 2026, lieten zien hoe de host werkt:

- De host start de app met `lsnode.js` van LiteSpeed, niet met Passenger zelf, op Node 24.20 en zonder bijzondere opties.
  `apps/site/server.js` is een ES-module en laadt zonder omweg.
- Het pad van Node 24 is `/opt/alt/alt-nodejs24/root/usr/bin/node`: CloudLinux zet elke versie van Node in een eigen map onder `/opt/alt`.
  Dat bleek bij de eerste handmatige run van de importer (zie stap 9).
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
