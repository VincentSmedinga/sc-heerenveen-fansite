# Artikelen van de redactie

Dit document is voor wie een artikel voor de sc Heerenveen Fansite schrijft.
Een artikel van onze eigen redactie staat op `/redactie/<adres>`, en het nieuwste staat als kaart "Van de redactie" bovenaan de homepage.
Een redacteur schrijft, bekijkt, publiceert en trekt een artikel in op `/beheer/artikelen` (zie _Een artikel schrijven en publiceren in het beheer_).
Zonder het beheer kan de projecteigenaar een artikel met een SQL-opdracht in de database zetten (zie _Een artikel in de database zetten_).

## Een artikel schrijven

Een artikel heeft deze delen:

| Deel   | Wat erin staat                                                                           | Hoogstens     |
| ------ | ---------------------------------------------------------------------------------------- | ------------- |
| Titel  | De titel boven het artikel                                                               | 120 tekens    |
| Adres  | Het stuk achter `/redactie/`: kleine letters, cijfers en streepjes, zoals `dit-zijn-wij` | 80 tekens     |
| Intro  | Een of twee zinnen onder de titel. Ze staan ook op de kaart en bij een gedeelde link     | 300 tekens    |
| Tekst  | Het artikel zelf, in de opmaak hieronder                                                 | 20.000 tekens |
| Auteur | De naam bij het artikel, zoals "de redactie" of een naam. De pagina zet er "Door" voor   | 100 tekens    |

Het adres kies je één keer.
Zodra het artikel gepubliceerd is en iemand de link heeft gedeeld, verander je het adres niet meer: de link werkt dan niet meer.
Het beheer laat dat ook niet toe: het adres van een gepubliceerd artikel staat vast.
Trek het artikel eerst in als het toch moet.

De datum staat er niet bij: de pagina zet de dag van publicatie onder de titel.

## De opmaak van de tekst

Je schrijft de tekst in de editor van het formulier, met de knoppen boven het tekstvak.
Wat de knoppen niet kennen, kan niet: een foto, een tabel of andere opmaak die je plakt, wordt gewone tekst.

| Je wilt                          | Je doet                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------ |
| Een nieuwe alinea                | Je drukt op Enter                                                              |
| Een kop                          | Je kiest "Kop" (een kop van niveau 2)                                          |
| Een lijst                        | Je kiest "Lijst" en drukt na elk punt op Enter; twee keer Enter sluit de lijst |
| **Vet**                          | Je selecteert de woorden en kiest "Vet", of drukt op Ctrl of Cmd en B          |
| _Cursief_                        | Je selecteert de woorden en kiest "Cursief", of drukt op Ctrl of Cmd en I      |
| Een link                         | Je kiest "Link", vult het adres en de tekst in en kiest "Link opslaan"         |
| Een link naar een pagina van ons | Hetzelfde, met een adres als `/bronnen`                                        |

De regels om op te letten:

- De titel van het artikel is al de kop van niveau 1, dus een kop in de tekst is altijd van niveau 2.
- Een punt van een lijst is één alinea: er zit geen lijst in een lijst.
- Een link gaat naar een adres dat met `https://` begint, of naar een pagina van ons die met een enkele `/` begint, zoals `/bronnen`.
  Geen `http://`, geen `www.lc.nl` zonder `https://` en geen `//`.
  De editor en de server weigeren zo'n adres.
  De server weigert ook een adres met een inlog erin (`https://www.lc.nl@evil.example`), want dat verbergt de echte site.
  Een link naar een andere site krijgt vanzelf het pictogram voor een externe link.
- Er is geen HTML en er zijn geen afbeeldingen.
  `<b>vet</b>` staat letterlijk in de tekst, met de tekens erbij.
- De editor werkt alleen met JavaScript.
  Dat geldt voor het schrijven; een bezoeker leest de pagina's ook zonder JavaScript.

## Bronnen noemen

Dit zijn de principes van het hoofdstuk Redactie van Storybook.
Voor een artikel betekent het:

- **Noem de bron.**
  Schrijf je iets na dat een ander eerst meldde, dan staat de naam van het medium in de tekst, met een link naar het verhaal: "Volgens de Leeuwarder Courant (…) trekt de club een nieuwe spits aan."
  Zo weet de lezer waar het vandaan komt, en gaat hij door naar de journalist (principe 4).
- **Schrijf in eigen woorden.**
  Neem geen alinea's over van een ander.
  Een korte zin tussen aanhalingstekens kan, met de naam van de bron erbij.
  Een kop van een ander citeer je zoals hij is gepubliceerd, ook met SC Heerenveen met hoofdletters (zie _sc Heerenveen met kleine letters_ in `beslissingen/redactie.md`).
- **Eigen tekst schrijft de club als sc Heerenveen**, met een kleine s en c, ook aan het begin van een zin.
- **Alles komt van onze server** (principe 3).
  Een link naar een andere site mag, want die volgt de lezer pas na een klik.
  Een afbeelding of een video van een ander kan niet: de opmaak kent ze niet.
- **Geen foto's.**
  Een artikel heeft nog geen foto's: ze komen later, met de naam van de maker erbij en alleen als we toestemming hebben (principe 2).

Schrijf in gewone woorden, op taalniveau B1, zoals de rest van de site.
Wie het artikel schrijft, leest het ook na: een tweede lezer is er nog niet (die komt met #40).

## Een artikel schrijven en publiceren in het beheer

De eigenaar, een redacteur en een auteur schrijven artikelen (#1156).
Een auteur ziet alleen de artikelen die hij zelf maakte: een artikel van een ander is voor hem "niet gevonden".
Hij heeft geen knop om te publiceren of in te trekken; dat doen de eigenaar en een redacteur, en de site weigert het ook als een auteur het verzoek zelf maakt.
Log in zoals bij elke beheerpagina en kies op `/beheer` de tegel "Artikelen".

1. Kies "Nieuw artikel" en vul de velden in.
   Schrijf de tekst met de knoppen van de editor (zie _De opmaak van de tekst_).
   Het adres vul je niet in: het volgt de titel, en laat je het leeg, dan maakt de site er een voorstel van.
   De auteur staat vooraf op "de redactie".
2. Kies "Opslaan als concept".
   Het artikel staat nergens op de site.
   Is een veld fout, dan blijft alles staan wat je typte, en staat de fout bovenaan en bij het veld.
3. Kies "Voorbeeld" om het artikel te zien zoals een bezoeker het ziet, op `/beheer/artikelen/<nummer>/voorbeeld`.
   Een concept heeft nog geen datum: het voorbeeld toont de dag van vandaag.
   Alleen wie is ingelogd opent het voorbeeld, en een auteur alleen dat van zijn eigen artikel.
   Browsers bewaren het niet en zoekmachines nemen het niet op.
4. Kies "Publiceren".
   Dat slaat op wat op het scherm staat en zet het artikel meteen op de site, met de tijd van dat moment.
   Is het het nieuwste artikel, dan staat het ook als kaart op de homepage.
5. Kies later "Opslaan" voor een wijziging.
   Een gepubliceerd artikel is meteen bijgewerkt.
   De datum van publicatie blijft, en het adres kan niet veranderen.
6. Kies "Intrekken" om het artikel van de site te halen.
   Het is dan weer een concept.
   Er is geen knop om te verwijderen.
   Publiceer je het later opnieuw, dan krijgt het de datum van dat moment.

Wat verder goed is om te weten:

- Een tweede klik, of een tweede tabblad, doet niets extra.
  Publiceer je wat al gepubliceerd is, dan zegt de pagina "Al gepubliceerd" en verandert er niets.
  Hetzelfde geldt voor intrekken.
- Elke actie komt in het logboek, de tabel `audit_log`: `article.create`, `article.update`, `article.publish` en `article.unpublish`, met het nummer van het account en van het artikel.
  Er staat niets van de tekst in.
  `article.update` staat er alleen als er iets veranderde.
  Lees het logboek in phpMyAdmin met `SELECT created_at, user_id, action, item_id FROM audit_log WHERE action LIKE 'article.%' ORDER BY id;`.
- Onder het formulier staat "Eerdere versies" (zie _Wat het beheer bewaart_).
- Een artikel met een datum in de toekomst, dat alleen met SQL kan, staat in de lijst als "Gepland voor …".
  Wil je het nu publiceren, trek het dan eerst in.
- De velden hebben deze grenzen: een titel van 120 tekens, een intro van 300, een auteur van 100, een adres van 80 en een tekst van 20.000 tekens.
  Bij de tekst telt de zichtbare tekst, niet de opmaak eromheen.
  Een adres heeft alleen kleine letters, cijfers en enkele streepjes, is niet van een ander artikel, en is niet de eerste naam van een pagina van de site, zoals `bronnen` of `beheer`.
- Een regeleinde in de titel, de intro of de auteur wordt een spatie.
  De server controleert de tekst bij elke keer opslaan, ook als de browser iets anders stuurt.
  Staat er iets in wat niet in een artikel kan, dan staat de fout bij het veld Tekst, en blijft wat je schreef staan.

## Wat het beheer bewaart

Het beheer bewaart elke versie van de tekst van een artikel, en wie het artikel het laatst veranderde.

- **Wat een versie bewaart:** de titel, het adres, de intro, de tekst en de auteur, met het moment van opslaan en het account dat opsloeg.
  Versie 1 is het artikel zoals het voor het eerst is opgeslagen.
  De nieuwste versie is altijd gelijk aan het artikel zelf.
- **Wanneer er een versie komt:** bij "Opslaan als concept" van een nieuw artikel, en bij elke wijziging die je opslaat of waarmee je publiceert.
  Opslaan zonder dat je iets veranderde, publiceren en intrekken maken geen versie.
  Dan verandert de tekst niet, en het logboek (`audit_log`) heeft de publicatie al.
- **Wat een versie niet bewaart:** of het artikel toen op de site stond.
  Dat staat in het logboek, bij `article.publish` en `article.unpublish`.
- **Wie wat deed:** `updated_by` in `articles` is het account dat het artikel het laatst veranderde, ook bij publiceren en intrekken.
  `saved_by` in `article_versions` is het account dat die versie opsloeg.
- **Lezen:** onder het formulier staat de lijst "Eerdere versies", de nieuwste bovenaan, met het nummer, de tijd en de voornaam van het account, of het e-mailadres zolang het geen voornaam heeft.
  Een versie opent op `/beheer/artikelen/<nummer>/versies/<versienummer>`, zoals een bezoeker de tekst zou zien.
  Alleen wie is ingelogd opent de lijst en die pagina's, en een auteur alleen die van zijn eigen artikel.
- **Terugzetten:** daar is geen knop voor.
  Wil je een oude tekst terug, kopieer hem dan uit de pagina van de versie en plak hem in het formulier.
- **Weghalen:** niets in de site wijzigt of verwijdert een versie.
- **SQL:** een wijziging met SQL (zie _Een artikel in de database zetten_) maakt geen versie.

Lees de versies in phpMyAdmin met `SELECT version, saved_at, saved_by, title FROM article_versions WHERE article_id = <nummer> ORDER BY version;`.

## Een artikel in de database zetten

Dit is een terugval voor als het beheer niet werkt.
De tekst is dan de JSON van de editor (zie _De tekst als JSON_ hieronder).
Open phpMyAdmin op de host, kies de database van de site en ga naar het tabblad SQL.
Lokaal werkt `docker compose exec mariadb mariadb fansite`, en dan eerst `SET NAMES utf8mb4;`, zodat de accenten goed aankomen.

### 1. Zoek het nummer van je account

Het artikel hoort bij een account van het beheer (zie _Inloggen voor het beheer met een link per e-mail, zonder wachtwoord_ en _Accounts voor het beheer maken we met een opdracht op de host_ in `beslissingen/site.md`).
Zoek het nummer op:

```sql
SELECT id, email, role, disabled_at FROM admin_users;
```

Kies het account dat aanstaat (`disabled_at` is leeg) en schrijf de `id` op.
Dat nummer komt in `created_by` en in `updated_by`, de kolom die zegt wie het artikel het laatst veranderde.
Er komt geen e-mailadres in het artikel.

### 2. Zet het artikel als concept

Zonder `published_at` is het artikel een concept: het staat op geen enkele pagina.
Zet de teksten tussen enkele aanhalingstekens.
Een enkel aanhalingsteken in de tekst schrijf je dubbel (`l''ordre`), en een backslash laat je weg, want die heeft in MariaDB een eigen betekenis.
De tekst (`<tekst>`) is de JSON van de editor, zoals hieronder staat.

```sql
INSERT INTO articles (slug, title, intro, body, author, created_by, updated_by)
VALUES (
  '<adres>',
  '<titel>',
  '<intro>',
  '<tekst>',
  '<auteur>',
  <nummer van het account>,
  <nummer van het account>
);
```

Het adres moet uniek zijn en mag alleen kleine letters, cijfers en enkele streepjes hebben.
Wijst de database een deel af, dan zegt ze welk.
Is een tekst te lang voor `title`, `intro`, `slug` of `author`, dan faalt de opdracht met een foutmelding.
Dat is de standaardinstelling van MariaDB 10.11.
Kijk na of er niets is afgekapt: `SELECT CHAR_LENGTH(intro) FROM articles WHERE slug = '<adres>';`.

Met SQL bewaar je geen versie van de tekst: alleen het beheer doet dat (zie _Wat het beheer bewaart_).
Het artikel heeft dan geen versie tot de eerste wijziging in het beheer.

### 3. Kijk het na en publiceer

Een concept staat niet op de site, maar je bekijkt het in het beheer: het staat in de lijst op `/beheer/artikelen` en heeft een voorbeeld.
Zet het artikel eerst op acceptatie, publiceer het daar en lees het na.
Acceptatie heeft een eigen database en staat niet in de zoekmachines.
Zet het artikel daarna met dezelfde opdrachten in de database van productie.

Publiceer met de tijd van nu:

```sql
UPDATE articles
SET published_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP(), updated_by = <nummer van het account>
WHERE slug = '<adres>';
```

Een `published_at` na het moment van nu telt als concept totdat dat moment komt.
Zo kun je een artikel dat vooruit gepland is zetten: `published_at = '2026-11-01 08:00:00'`, in UTC.
Dat is twee uur eerder dan de klok in Nederland in de zomer en één uur eerder in de winter.

Op `/redactie/<adres>` staat het artikel meteen, en op de homepage de kaart, als dit het nieuwste gepubliceerde artikel is.
De pagina en de kaart komen elke keer uit de database, dus er is geen wachttijd.

### 4. Verander of trek in

Verander de tekst, en zet `updated_at` en `updated_by` erbij:

```sql
UPDATE articles
SET body = '<nieuwe tekst>', updated_at = UTC_TIMESTAMP(), updated_by = <nummer van het account>
WHERE slug = '<adres>';
```

Trek een artikel in door `published_at` leeg te maken.
Het is dan een concept en staat nergens meer, ook niet in de sitemap.
Zet er later weer een tijd in om het terug te zetten.

```sql
UPDATE articles
SET published_at = NULL, updated_at = UTC_TIMESTAMP(), updated_by = <nummer van het account>
WHERE slug = '<adres>';
```

Verwijder een artikel niet: intrekken is te herstellen, en een gedeelde link blijft dan een pagina "niet gevonden" geven in plaats van een gat te laten.

### 5. Controleer het resultaat

```sql
SELECT id, slug, title, published_at FROM articles ORDER BY id;
```

Open daarna `/redactie/<adres>` en de homepage.
Een verkeerd adres of een concept geeft de pagina "Pagina niet gevonden".
De pagina verraadt niet of het adres een concept is.

### De tekst als JSON

De tekst van een artikel is Tiptap's JSON.
Een document heeft `type` `doc` en een lijst `content` met alinea's (`paragraph`), koppen (`heading`, met `attrs` `{"level":2}`) en lijsten (`bulletList`, met `listItem` die elk één `paragraph` hebben).
Stukjes tekst zijn `text` met `text` en eventueel `marks`: `bold`, `italic` of `link` met `attrs` `{"href":"…"}`.
Een voorbeeld, met een alinea en een kop:

```json
{
  "type": "doc",
  "content": [
    { "type": "paragraph", "content": [{ "type": "text", "text": "Wij zijn de redactie." }] },
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Wat je mag verwachten" }] }
  ]
}
```

Een tekst die niet klopt, of iets bevat wat niet op de lijst staat, toont de pagina niet: ze blijft leeg.
Schrijf je het artikel liever in het beheer en haal je de JSON uit de kolom `body`, dan weet je zeker dat hij klopt.
De oude opmaak met `##` en `**` werkt niet meer.
Artikelen en versies die er nog mee zijn opgeslagen, zijn bij het starten van de site omgezet.

## Voor wie de code leest

- De tabellen heten `articles` en `article_versions` (zie `packages/db/src/schema.ts`), en de vragen naar de eerste staan in `packages/db/src/queries.ts`: `findPublishedArticle`, `findNewestArticle` en `listPublishedArticles`.
  Een artikel is gepubliceerd als `published_at` gevuld is en niet na het moment van nu ligt.
- `readArticleDocument` in `packages/shared/src/article-document.ts` controleert de JSON van de tekst tegen de lijst met wat mag, en `apps/site/src/ArticleText.tsx` maakt er elementen van.
  Er is geen `dangerouslySetInnerHTML`, en de tests (`article-document.test.ts` en `ArticleText.test.tsx`) proberen HTML, `javascript:`-adressen, `//evil.example`, een diepe nesting en teksten van een miljoen tekens.
- `migrateArticleBodies` in `packages/db/src/article-body-migration.ts` heeft de artikelen en versies in de oude opmaak omgezet naar JSON (zie _Artikelen schrijven vraagt JavaScript, lezen niet_ en de beslissing erboven in `beslissingen/redactie.md`).
- Het beheer staat in `apps/site/src/app/beheer/artikelen` (de lijst, het formulier, de serveracties en het voorbeeld).
  De queries en de wijzigingen staan in `apps/site/src/beheer/articles.ts`, de controle van het formulier in `article-form.ts`.
  Elke serveractie begint met `requireRole`, voor elke rol bij schrijven en opslaan en alleen voor de eigenaar en een redacteur bij intrekken, en elke wijziging schrijft met `recordAction` in dezelfde transactie een regel in het logboek.
  Een wijziging van de tekst voegt in diezelfde transactie met `recordVersion` (`apps/site/src/beheer/article-versions.ts`) een versie toe, en elke wijziging zet `updated_by`.
  Alleen `article-versions.ts` raakt `article_versions`, alleen met `INSERT`, en `article-versions.test.ts` houdt dat zo.
- De pagina is `apps/site/src/app/redactie/[slug]/page.tsx`, de kaart staat in `apps/site/src/app/page.tsx`, en beide gebruiken de componenten `Article` en `ArticleCard` van het designsysteem.
- De testgegevens staan in `apps/site/e2e/articles.ts`: een artikel met drie versies, een concept en een artikel voor later.
  `apps/site/e2e/writing.spec.ts` schrijft met de editor, bekijkt, publiceert en trekt een verzonnen artikel in, en leest het ook zonder JavaScript.
  Op acceptatie zet de seed geen artikel: de eigenaar zet het eerste artikel zelf, met de opdrachten hierboven.
