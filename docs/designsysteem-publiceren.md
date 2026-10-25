# Storybook publiceren

Storybook, het designsysteem met zijn documentatie, staat op <https://ds.heerenveen.org>.
Het is een eigen website op de gedeelde hosting van mijn.host, naast het forum en de acceptatieomgeving.
Dit bestand zegt hoe dat werkt, wat de eigenaar eenmalig zelf instelt, en hoe je controleert dat het klopt.
De keuzes erachter staan in [`beslissingen.md`](beslissingen.md), onder _Storybook staat op ds.heerenveen.org_.

## Zo werkt het

De workflow [`storybook.yml`](../.github/workflows/storybook.yml) heeft twee taken:

1. **Build Storybook** draait bij elke pull request en bij elke run op `main`.
   Hij bouwt Storybook (`pnpm --filter design-system build-storybook`), controleert dat er geen `--lightningcss` in de CSS staat en bewaart de build als artifact `storybook`.
   Bij een pull request kun je dat artifact downloaden om de build te bekijken.
2. **Deploy to ds.heerenveen.org** draait alleen op `main`.
   Hij haalt het artifact van de taak ervoor op en kopieert het met rsync over SSH, op poort 26, naar de map van het subdomein.
   Daarna vraagt hij `https://ds.heerenveen.org/index.json` en `https://ds.heerenveen.org/manifests/components.json` op, tot een minuut lang.
   De run wordt rood als een van beide niet met 200 antwoordt, of niet hetzelfde is als het bestand in de build.

Een push naar `main` start de workflow alleen als hij iets wijzigt waar Storybook uit bestaat: iets in `packages/design-system/`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` of `.github/workflows/storybook.yml`.
Een samenvoeging die alleen `apps/` of `docs/` raakt, zet niets neer.
Met de hand starten kan altijd: _Actions → Storybook → Run workflow_, op `main`.

Op de server bouwen we niets: het zijn statische bestanden.
Er draait geen app, dus er is geen database en geen Node.js-app.

Ontbreekt een van de geheimen hieronder, dan bouwt de workflow wel en meldt hij dat het kopiëren is overgeslagen.
`main` wordt er niet rood van.
Is `DEPLOY_PATH` niet de document root van het subdomein, dan stopt de run met een fout (rood) en kopieert hij niets.
Dat is bedoeld: rsync maakt met `--delete` de doelmap leeg, dus een verkeerd pad mag nooit tot een kopie leiden.

De kopie laat `.well-known/` (voor het vernieuwen van het certificaat), `.htaccess` en `cgi-bin/` van de host staan.
Storybook doet geen verzoeken naar derden en stuurt geen telemetrie (zie `.storybook/main.ts`).
Alles wat de pagina's laden, staat in de build zelf.

## Eenmalig instellen

De eigenaar doet dit zelf, in DirectAdmin en in GitHub.
Een agent heeft daar geen toegang.

1. **Subdomein.**
   Maak in DirectAdmin onder het domein `heerenveen.org` het subdomein `ds` aan, dus `ds.heerenveen.org`.
   Kies bij _Document Root_ de map `/domains/ds.heerenveen.org/public_html`, zoals bij acceptatie, en niet een map in de `public_html` van het forum.
   Het pad van deze map is straks `DEPLOY_PATH`, en de workflow weigert elk ander pad.
   Vraag daarna een certificaat aan (Let's Encrypt), zonder wildcard (zie stap 1 in [`acceptatieomgeving.md`](acceptatieomgeving.md) voor waarom).
   Zonder certificaat geeft `https://ds.heerenveen.org` een certificaatfout.
2. **SSH-sleutel voor de deploys.**
   Maak een sleutel die alleen hiervoor dient, zonder wachtwoord (de workflow kan er geen invullen).
   Gebruik niet de sleutel van acceptatie: zo trek je ze los van elkaar in.

   ```sh
   ssh-keygen -t ed25519 -N '' -C 'fansite designsystem deploy' -f ~/.ssh/fansite-designsystem
   ```

   Zet de publieke sleutel (`fansite-designsystem.pub`) in DirectAdmin bij de SSH-sleutels van het account.
   Controleer dat inloggen werkt: `ssh -p 26 -i ~/.ssh/fansite-designsystem <gebruiker>@<host>`.
   Op de gedeelde hosting heeft elke sleutel de rechten van het hele account.
   Beperken tot één map kan met `rrsync` en een regel `command="rrsync <map>",restrict` voor de sleutel in `~/.ssh/authorized_keys`, als `rrsync` op de host staat (`ls /usr/bin/rrsync`).
   De workflow past daar nu niet bij: rrsync leest het pad van rsync vanaf die map, en de controle van `DEPLOY_PATH` in `storybook.yml` weigert zo'n pad.
   Voor die beperking moet dus ook de workflow veranderen.
   Dat is niet uitgeprobeerd, dus laat het weg tenzij je het wilt uitzoeken.

3. **Hostsleutel.**
   De workflow vertrouwt alleen de host die je hier vastlegt.
   Haal de sleutel op met `ssh-keyscan -p 26 <host>` en vergelijk de vingerafdruk met die van mijn.host.
   Het is dezelfde host als bij acceptatie, dus de uitvoer is dezelfde.
4. **GitHub.**
   Maak onder _Settings → Environments_ de omgeving `designsystem` aan en beperk _Deployment branches_ tot `main`.
   Voeg deze geheimen toe aan die omgeving:

   | Geheim            | Wat erin staat                                                                                                                              |
   | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
   | `SSH_PRIVATE_KEY` | De hele inhoud van `~/.ssh/fansite-designsystem`                                                                                            |
   | `SSH_KNOWN_HOSTS` | De uitvoer van `ssh-keyscan -p 26 <host>`                                                                                                   |
   | `SSH_HOST`        | De hostnaam van de SSH-server                                                                                                               |
   | `SSH_USER`        | De gebruikersnaam voor SSH, dezelfde als die van DirectAdmin                                                                                |
   | `DEPLOY_PATH`     | Het volledige pad van de document root van `ds`, zonder slash aan het eind, zoals `/home/<gebruiker>/domains/ds.heerenveen.org/public_html` |

5. **Eerste deploy.**
   Start de workflow met _Actions → Storybook → Run workflow_ op `main`, of voeg een wijziging in `packages/design-system/` samen met `main`.
   De deploy vervangt de plaatsvervangende pagina `index.html` van mijn.host.
6. **GitHub Pages uitzetten.**
   Doe dit pas als de eerste deploy slaagt en <https://ds.heerenveen.org> Storybook toont.
   Kies onder _Settings → Pages_ bij _Source_ voor _None_ (of haal de site daar weg), zodat de oude Storybook op GitHub Pages verdwijnt.
   De omgeving `github-pages` onder _Settings → Environments_ kun je daarna verwijderen.

## Controleren

- <https://ds.heerenveen.org> toont Storybook, met in de zijbalk de hoofdstukken van het designsysteem.
- <https://ds.heerenveen.org/?path=/docs/redactie--documentatie> opent het hoofdstuk Redactie.
  Zo wijzen de links in `CONTRIBUTING.md` en in het sjabloon van de pull request.
- `curl -s https://ds.heerenveen.org/index.json | head -c 200` toont JSON die begint met `{"v":5,"entries":`.
- `curl -s https://ds.heerenveen.org/manifests/components.json | head -c 200` toont JSON met `"components"`.
- In de run van de workflow staat bij _Check ds.heerenveen.org_ twee keer "is the file of this build".
- Een samenvoeging die alleen `apps/site` of `docs/` wijzigt, start de workflow niet: onder _Actions → Storybook_ staat er geen nieuwe run.
- Controleer in de ontwikkelaarstools van je browser, onder Network, dat de pagina's alleen verzoeken doen naar `ds.heerenveen.org`.

## Als het niet werkt

- De workflow meldt "Deploy skipped": een geheim ontbreekt.
  De melding noemt welk.
- De workflow meldt "Deploy stopped" over `DEPLOY_PATH`: het pad is niet de document root van `ds.heerenveen.org`.
  Controleer het geheim.
  Het moet beginnen met een slash en eindigen op `/domains/ds.heerenveen.org/public_html`.
- De rsync-stap faalt met `Host key verification failed`: `SSH_KNOWN_HOSTS` klopt niet met de host.
  Haal de sleutel opnieuw op (stap 3).
- De rsync-stap faalt met `Permission denied (publickey)`: de publieke sleutel staat niet bij de SSH-sleutels van het account, of `SSH_PRIVATE_KEY` is niet de hele inhoud van het bestand.
- _Check ds.heerenveen.org_ is rood: de kopie lukte, maar het adres geeft niet de bestanden van deze build.
  Controleer of het certificaat er is, of `ds.heerenveen.org` naar de map van `DEPLOY_PATH` wijst (_Document Root_ in stap 1), en of `index.json` in die map staat.
- Pagina's tonen een oude versie: de browser of de host bewaart de bestanden.
  Ververs zonder cache; Storybook laadt zijn bestanden onder een naam met een code, dus een nieuwe versie heeft nieuwe namen.
