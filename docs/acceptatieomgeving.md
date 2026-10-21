# Acceptatieomgeving

De acceptatieomgeving staat op <https://acc.sc.heerenveen.org>.
Het is een tweede website op de gedeelde hosting van mijn.host, naast het forum.
Elke merge naar `main` zet er een nieuwe versie van de site op.
Zo kijkt de groep een versie na voordat hij live gaat (productie komt met #33).

Dit bestand zegt hoe dat werkt, wat de eigenaar eenmalig zelf instelt, en hoe je controleert dat het klopt.

## Zo werkt het

De workflow [`acceptance.yml`](../.github/workflows/acceptance.yml) doet bij elke merge naar `main` vier dingen:

1. Hij bouwt de site (`pnpm --filter site build`) en zet het resultaat in één map (`pnpm --filter site assemble`).
2. Hij start die map zoals de host dat doet en controleert wat een bezoeker en een zoekmachine krijgen (`pnpm --filter site smoke`).
3. Hij kopieert de map met rsync over SSH, op poort 26, naar de map van de app op de host.
4. Hij raakt `tmp/restart.txt` aan, zodat Passenger de app opnieuw start.

Op de server bouwen we niets.
De map bevat de standalone build van Next.js met zijn eigen `node_modules`.

Ontbreekt een van de geheimen hieronder, dan doet de workflow alleen stap 1 en 2 en meldt dat het kopiëren is overgeslagen.
`main` wordt er niet rood van.

De site leest bij het opstarten de variabele `SITE_ENV`.
Op acceptatie is dat `acceptance`.
Dan krijgt elk antwoord de header `X-Robots-Tag: noindex, nofollow`, en weigert `/robots.txt` alles.
Zonder `SITE_ENV` start de site niet.

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
   - Omgevingsvariabele: `SITE_ENV` met de waarde `acceptance`.
   - Kies **niet** _Run NPM Install_: de build brengt zijn eigen `node_modules` mee.
     Staat er in de map van de app al een `node_modules` die een symbolische link is, verwijder die link dan.
3. **Database.**
   Maak onder _MySQL Management_ een lege database met een eigen gebruiker voor acceptatie.
   Bewaar de gegevens in je wachtwoordmanager.
   De site gebruikt de database nog niet (dat komt met #8), en de gegevens komen nooit in GitHub of in de repository.
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
   | `SSH_USER`        | De gebruikersnaam voor SSH                                         |
   | `DEPLOY_PATH`     | Het volledige pad van de map van de app, zonder slash aan het eind |

7. **Eerste deploy.**
   Start de workflow met _Actions → Acceptance → Run workflow_, of voeg een wijziging samen met `main`.

## Controleren

- De pagina op <https://acc.sc.heerenveen.org> laat "sc Heerenveen Fansite" en "Binnenkort meer." zien.
- `curl -I https://acc.sc.heerenveen.org` toont `x-robots-tag: noindex, nofollow`.
- <https://acc.sc.heerenveen.org/robots.txt> toont `Disallow: /`.

## Als het niet werkt

- De workflow meldt "Deploy skipped": een geheim ontbreekt.
  De melding noemt welk.
- De site start niet: kijk in het logboek van de app (_Setup Node.js App_ of het bestand `stderr.log` in de map van de app).
  Een ontbrekende of verkeerde `SITE_ENV` staat daar met naam bij.
- Passenger kan `apps/site/server.js` niet laden: dat bestand is een ES-module.
  Meld dat op #6; een klein startbestand met `import()` lost het op.

## Wat we nog niet hebben getest

We hadden bij het bouwen geen toegang tot de hosting.
Getest zijn de build, de map en de rooktest, lokaal en in CI.
Deze punten blijken pas bij de eerste deploy:

- of Passenger op mijn.host de standalone build van Next.js start, en `apps/site/server.js` als startbestand accepteert;
- of rsync met `--delete` de bestanden die de hosting zelf in de map van de app zet, ongemoeid laat.
  Alleen `tmp/` en `.htaccess` staan op de uitzonderingenlijst in de workflow.

## Productie

Productie komt met #33, met een eigen omgeving in GitHub en een eigen app op de hosting.
Die app krijgt `SITE_ENV=production`; zonder die waarde blijft de site uit de zoekmachines.
