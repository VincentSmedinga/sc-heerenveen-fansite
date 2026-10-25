# Storybook publiceren

Storybook, het designsysteem met zijn documentatie, staat op <https://ds.heerenveen.org>.
Het is een eigen website op de gedeelde hosting van mijn.host, naast het forum en de acceptatieomgeving.
Op hetzelfde adres staat de MCP-server van het designsysteem, op <https://ds.heerenveen.org/mcp>: openbaar en alleen-lezen, voor agents in andere repositories.
Dit bestand zegt hoe dat werkt, wat de eigenaar eenmalig zelf instelt, en hoe je controleert dat het klopt.
De keuzes erachter staan in [`beslissingen.md`](beslissingen.md), onder _Storybook staat op ds.heerenveen.org_ en _De MCP-server van het designsysteem staat op ds.heerenveen.org/mcp_.

## Zo werkt het

De workflow [`storybook.yml`](../.github/workflows/storybook.yml) heeft twee taken:

1. **Build Storybook** draait bij elke pull request en bij elke run op `main`.
   Hij bouwt Storybook (`pnpm --filter design-system build-storybook`), controleert dat er geen `--lightningcss` in de CSS staat en dat `index.html` en `iframe.html` `noindex` hebben, en bewaart de build als artifact `storybook`.
   Daarna bouwt hij de MCP-server tot één bestand, `server.mjs`, en bewaart dat als artifact `design-system-mcp`.
   Voor het bewaren start hij de server twee keer, naast de Storybook die hij net maakte, en vraagt beide wat een agent vraagt (zie _De MCP-server_).
   Bij een pull request kun je de artifacts downloaden om de build te bekijken.
2. **Deploy to ds.heerenveen.org** draait alleen op `main`.
   Hij haalt de artifacts van de taak ervoor op en kopieert ze met rsync over SSH, op poort 26: Storybook naar de map van het subdomein, de MCP-server naar een eigen map ernaast.
   Daarna vraagt hij `https://ds.heerenveen.org/index.json` en `https://ds.heerenveen.org/manifests/components.json` op, tot een minuut lang.
   De run wordt rood als een van beide niet met 200 antwoordt, of niet hetzelfde is als het bestand in de build.
   Dan raakt hij `tmp/restart.txt` van de MCP-server aan en vraagt `https://ds.heerenveen.org/mcp` om `initialize`, de lijst met gereedschappen en `docs-list`, tot anderhalve minuut lang.
   De run wordt rood als de server niet antwoordt, andere gereedschappen geeft dan de drie voor de documentatie, of een component van de build uit het overzicht mist.

Een push naar `main` start de workflow alleen als hij iets wijzigt waar Storybook of de MCP-server uit bestaat: iets in `packages/design-system/` of `apps/design-system-mcp/`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` of `.github/workflows/storybook.yml`.
Een samenvoeging die alleen `apps/site` of `docs/` raakt, zet niets neer.
Een wijziging aan alleen de MCP-server zet ook Storybook opnieuw neer; die kopie verandert niets, want rsync neemt over wat gelijk is.
Met de hand starten kan altijd: _Actions → Storybook → Run workflow_, op `main`.

Op de server bouwen we niets.
Storybook bestaat uit statische bestanden, en de MCP-server is één JavaScript-bestand zonder `node_modules`.
Er is geen database.

De twee kopieën raken elkaars bestanden niet:

- Storybook gaat naar `domains/ds.heerenveen.org/public_html` (`DEPLOY_PATH`).
  De MCP-server gaat naar `domains/ds.heerenveen.org/mcp`, ernaast en dus niet in de document root.
  `--delete` van de kopie van Storybook kan de app dus niet leegmaken.
  Voor het geval de host in de document root een map `mcp` maakt voor de app, slaat die kopie `/mcp/` over.
- De kopie van de MCP-server laat `tmp/` (het herstartbestand van de host), `stderr.log` (zijn logboek), `.htaccess` en `node_modules` staan.
- Er is geen tweede geheim voor het pad van de app.
  De workflow maakt het uit `DEPLOY_PATH`, dat al moet eindigen op `/domains/ds.heerenveen.org/public_html`, en controleert het resultaat nog eens: het moet eindigen op `/domains/ds.heerenveen.org/mcp`.
  Elk ander pad stopt de run zonder te kopiëren.

Ontbreekt een van de geheimen hieronder, dan bouwt de workflow wel en meldt hij dat het kopiëren is overgeslagen.
`main` wordt er niet rood van.
Is `DEPLOY_PATH` niet de document root van het subdomein, dan stopt de run met een fout (rood) en kopieert hij niets.
Dat is bedoeld: rsync maakt met `--delete` de doelmap leeg, dus een verkeerd pad mag nooit tot een kopie leiden.

De kopie laat `.well-known/` (voor het vernieuwen van het certificaat), `.htaccess` en `cgi-bin/` van de host staan.
Storybook doet geen verzoeken naar derden en stuurt geen telemetrie (zie `.storybook/main.ts`).
Alles wat de pagina's laden, staat in de build zelf.

## De MCP-server

`apps/design-system-mcp` is een kleine Node.js-app rond `@storybook/mcp`, de losse MCP-server van Storybook (een bibliotheek, geen server).
Hij geeft de documentatie van de gepubliceerde Storybook aan agents: `docs-list` (het overzicht van componenten en pagina's), `docs-show` (een component met zijn props, typen en stories) en `docs-show-story`.
Een agent in een andere map voegt hem toe met:

```sh
claude mcp add --transport http ds https://ds.heerenveen.org/mcp
```

Agents in deze repository gebruiken de lokale server van Storybook (zie `AGENTS.md`); die heeft ook de gereedschappen om te ontwikkelen en te testen, en toont de worktree waarin hij draait.

- **Openbaar en alleen-lezen:** geen login, geen cookies, geen telemetrie en geen verzoeken naar derden.
  De app leest alleen bestanden onder `manifests/` van de document root, en alleen `.json`.
  Het logboek (`stderr.log`) bevat de start van de app en wat misging, zonder adressen van bezoekers en zonder inhoud van verzoeken.
- **Alleen `/mcp`:** elk ander adres geeft `404 Not found`, voor elk adres dezelfde tekst.
  Alleen `POST` wordt beantwoord; `GET`, `DELETE` en de rest krijgen `405`.
  Een verzoek van meer dan 64 kB krijgt `413`.
- **Elk verzoek staat los:** de server houdt geen sessie bij en geeft geen sessie-id.
  Een client die op het ene proces begint en op het andere verdergaat, merkt daar niets van.
  De bibliotheek bewaart sessies in het geheugen van één proces en opent voor elke `GET` een stream; dat past niet bij een host die meer dan één proces kan starten.
  De app maakt daarom voor elk verzoek een nieuwe handler en weigert `GET` en `DELETE`.
- **De manifests komen van schijf:** de app leest `manifests/components.json` en `manifests/docs.json` uit de document root, bij elk verzoek opnieuw.
  Een nieuwe deploy is dus zichtbaar zodra rsync de bestanden vervangen heeft.
  De map vindt de app zelf: `../public_html`, vanaf de map waarin `server.mjs` staat.
  Daarom moet de map van de app `domains/ds.heerenveen.org/mcp` zijn, naast `public_html`.
  Staat de document root ergens anders, zet dan de omgevingsvariabele `STORYBOOK_DIR` op die map.
  Niet via `https://ds.heerenveen.org/manifests/…` lezen, want de bibliotheek haalt dan de bestanden op van het adres uit het verzoek zelf.

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

7. **Node.js-app voor de MCP-server.**
   Doe dit **voordat** je de pull request met de MCP-server samenvoegt: de eerste deploy controleert `https://ds.heerenveen.org/mcp` en wordt rood als de app er niet is.
   Maak in DirectAdmin onder _Setup Node.js App_ een app:
   - Node.js-versie: 24.
   - Modus: Production.
   - Map van de app (_Application root_): `domains/ds.heerenveen.org/mcp`.
     Dat is naast `public_html`, niet erin, en de workflow kopieert er naartoe.
   - Adres van de app (_Application URL_): het domein `ds.heerenveen.org` met het pad `mcp`.
     Dit is niet uitgeprobeerd: of _Setup Node.js App_ een pad toelaat, weten we pas als de eigenaar het probeert.
     Laat het formulier het pad niet toe, zet dan niets anders neer, maar meld het in het issue (#213).
     De alternatieven zijn een eigen subdomein voor de app, zoals `mcp.heerenveen.org`, of een app die het hele subdomein beantwoordt en de statische bestanden zelf teruggeeft.
     Beide veranderen het adres of de opzet, dus daar beslist de eigenaar over.
   - Startbestand (_Application startup file_): `server.mjs`.
   - Omgevingsvariabelen: geen.
   - Kies **niet** _Run NPM Install_: er is geen `package.json`, en `server.mjs` heeft geen `node_modules` nodig.
     Staat er in de map een `node_modules` die een symbolische link is, laat die staan: de kopie slaat hem over.

   Maakt de host de map van de app niet zelf aan en klaagt het formulier daarover, maak dan de lege map `domains/ds.heerenveen.org/mcp` aan met de bestandsbeheerder van DirectAdmin.
   Er hoeft niets in te staan: de eerste deploy zet `server.mjs` erin.
   Zet de app daarna aan.
   Waarschijnlijk zet de host de instellingen voor het pad in `public_html/.htaccess`, maar dat is niet uitgeprobeerd.
   De kopie van Storybook laat dat bestand in elk geval staan.

8. **Eerste deploy van de MCP-server.**
   Voeg de pull request samen, of start _Actions → Storybook → Run workflow_ op `main`.
   De stap _Check ds.heerenveen.org/mcp_ moet slagen (zie _Controleren_).

## Controleren

- <https://ds.heerenveen.org> toont Storybook, met in de zijbalk de hoofdstukken van het designsysteem.
- <https://ds.heerenveen.org/?path=/docs/redactie--documentatie> opent het hoofdstuk Redactie.
  Zo wijzen de links in `CONTRIBUTING.md` en in het sjabloon van de pull request.
- `curl -s https://ds.heerenveen.org/index.json | head -c 200` toont JSON die begint met `{"v":5,"entries":`.
- `curl -s https://ds.heerenveen.org/manifests/components.json | head -c 200` toont JSON met `"components"`.
- `curl -s https://ds.heerenveen.org/ | grep -io '<meta name="robots"[^>]*>'` en hetzelfde voor `https://ds.heerenveen.org/iframe.html` tonen elk één keer `<meta name="robots" content="noindex">`.
  Zo blijft Storybook uit de zoekresultaten.
  Er is bewust geen `robots.txt`: een `Disallow` houdt ook agents en leesgereedschap tegen die zich eraan houden, en die moeten de documentatie kunnen lezen.
- `curl -sI https://ds.heerenveen.org/apple-touch-icon.png https://ds.heerenveen.org/favicon.ico https://ds.heerenveen.org/icon.svg` antwoordt drie keer met 200.
  Het zijn de iconen van Storybook, in het roze van Storybook, en `index.html` en `iframe.html` verwijzen ernaar.
  Safari toont het roze vlak met het schild in de favorieten.
- In de run van de workflow staat bij _Check ds.heerenveen.org_ twee keer "is the file of this build".
- Een samenvoeging die alleen `apps/site` of `docs/` wijzigt, start de workflow niet: onder _Actions → Storybook_ staat er geen nieuwe run.
- Controleer in de ontwikkelaarstools van je browser, onder Network, dat de pagina's alleen verzoeken doen naar `ds.heerenveen.org`.
- In de run van de workflow slaagt de stap _Check ds.heerenveen.org/mcp_ en zegt "docs-list names all … components of the build".
- De server antwoordt op een `initialize`:

  ```sh
  curl -s -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}' \
    https://ds.heerenveen.org/mcp
  ```

  Het antwoord begint met `event: message` en bevat `"serverInfo"`.

- Een ander adres onder de app geeft `404`, en geen van beide mag iets laten zien van de host: `curl -i https://ds.heerenveen.org/mcp/anders` en `curl -i -X GET https://ds.heerenveen.org/mcp` (`405`).
  Storybook zelf blijft werken: <https://ds.heerenveen.org> en `index.json` zijn nog dezelfde.
- Een sessie van Claude Code in een andere map voegt de server toe met `claude mcp add --transport http ds https://ds.heerenveen.org/mcp`.
  `/mcp` toont `ds` als verbonden, en een vraag naar de props van `Heading` wordt beantwoord met `level` en `appearance`, met hun typen.

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
- De stap _Copy the MCP server to the host_ meldt "Deploy stopped": het pad van de app is niet `domains/ds.heerenveen.org/mcp`.
  Controleer `DEPLOY_PATH`: de workflow maakt het pad van de app daaruit.
- _Check ds.heerenveen.org/mcp_ is rood met `404`: de host stuurt het pad niet naar de app.
  Controleer in _Setup Node.js App_ dat het adres van de app `ds.heerenveen.org` met pad `mcp` is, en dat de app aanstaat.
  Zie ook stap 7 als het formulier het pad niet toelaat.
- _Check ds.heerenveen.org/mcp_ is rood met `500` of `503`, of met "fetch failed": de app start niet.
  Lees `stderr.log` in `domains/ds.heerenveen.org/mcp`, of het logboek in _Setup Node.js App_.
  Controleer dat Node 24 gekozen is, dat het startbestand `server.mjs` heet, en dat het bestand in de map staat.
- _Check ds.heerenveen.org/mcp_ meldt dat `docs-list` componenten mist, of dat een manifest niet gevonden is: de app leest een andere map dan de document root.
  De map van de app moet `domains/ds.heerenveen.org/mcp` zijn.
  Anders zet je `STORYBOOK_DIR` op de document root.
- Pagina's tonen een oude versie: de browser of de host bewaart de bestanden.
  Ververs zonder cache; Storybook laadt zijn bestanden onder een naam met een code, dus een nieuwe versie heeft nieuwe namen.
