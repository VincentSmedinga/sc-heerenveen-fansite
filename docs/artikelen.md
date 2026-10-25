# Artikelen van de redactie

Dit document is voor wie een artikel voor de sc Heerenveen Fansite schrijft.
Een artikel van onze eigen redactie staat op `/redactie/<adres>`, en het nieuwste staat als kaart "Van de redactie" bovenaan de homepage.
Een scherm om te schrijven en te publiceren komt met #264.
Tot dat klaar is, zet de projecteigenaar een artikel met een SQL-opdracht in de database (zie _Een artikel in de database zetten_).

## Een artikel schrijven

Een artikel heeft deze delen:

| Deel   | Wat erin staat                                                                           | Hoogstens                     |
| ------ | ---------------------------------------------------------------------------------------- | ----------------------------- |
| Titel  | De titel boven het artikel                                                               | 120 tekens                    |
| Adres  | Het stuk achter `/redactie/`: kleine letters, cijfers en streepjes, zoals `dit-zijn-wij` | 80 tekens                     |
| Intro  | Een of twee zinnen onder de titel. Ze staan ook op de kaart en bij een gedeelde link     | 300 tekens                    |
| Tekst  | Het artikel zelf, in de opmaak hieronder                                                 | geen grens, houd het leesbaar |
| Auteur | De naam bij het artikel, zoals "de redactie" of een naam. De pagina zet er "Door" voor   | 100 tekens                    |

Het adres kies je één keer.
Zodra het artikel gepubliceerd is en iemand de link heeft gedeeld, verander je het adres niet meer: de link werkt dan niet meer.

De datum staat er niet bij: de pagina zet de dag van publicatie onder de titel.

## De opmaak van de tekst

De opmaak is klein, en wat ze niet kent, blijft gewone tekst.

| Je wilt                          | Je schrijft                                         |
| -------------------------------- | --------------------------------------------------- |
| Een nieuwe alinea                | Een lege regel tussen twee alinea's                 |
| Een kop                          | Een regel die met `## ` begint, met een spatie erna |
| Een lijst                        | Elke regel van de lijst begint met `- `             |
| **Vet**                          | `**vet**`                                           |
| _Cursief_                        | `*cursief*`                                         |
| Een link                         | `[de tekst van de link](https://www.lc.nl/sport)`   |
| Een link naar een pagina van ons | `[Onze bronnen](/bronnen)`                          |

Een voorbeeld:

```text
Wij zijn de redactie van de Fansite.
We **schrijven** niet over wat anderen al schreven, maar we wijzen je de weg.

## Wat je van ons mag verwachten

- Altijd de bron erbij
- Een link naar het hele verhaal

Lees ook [Onze bronnen](/bronnen).
```

De regels om op te letten:

- Een kop is een regel op zich, met een lege regel erboven en eronder.
  Het is een kop van niveau 2, want de titel van het artikel is al de kop van niveau 1.
- Regels onder elkaar zonder lege regel ertussen horen bij één alinea; ze lopen op de pagina in elkaar over.
- Een lijst bestaat alleen uit regels met `- `.
  Staat er tussen de regels van een lijst een gewone regel, dan is het geen lijst.
- Vet staat in een alinea of een lijstpunt, tussen `**` en `**`.
  Cursief mag erin staan: `**vet en *cursief* erin**`.
  Vet in cursief werkt niet.
  Een kop blijft gewone tekst, ook met `*` of `**` erin.
- Een spatie binnen de tekens maakt er gewone tekst van: `2 * 3 * 4` blijft zoals het staat.
- Een link gaat naar een adres dat met `https://` begint, of naar een pagina van ons die met een enkele `/` begint, zoals `/bronnen`.
  Geen `http://`, geen `www.lc.nl` zonder `https://` en geen `//`.
  Zo'n link blijft gewone tekst.
  De tekst van een link is gewone tekst: vet of cursief erin werkt niet, en `[` en `]` kunnen er niet in.
  Een adres met haakjes werkt niet; schrijf `%28` voor `(` en `%29` voor `)`.
  Een link naar een andere site krijgt vanzelf het pictogram voor een externe link.
- Er is geen HTML en er zijn geen afbeeldingen.
  `<b>vet</b>` staat letterlijk in de tekst, met de tekens erbij.

## Bronnen noemen

Dit zijn de principes van het hoofdstuk Redactie van Storybook.
Voor een artikel betekent het:

- **Noem de bron.**
  Schrijf je iets na dat een ander eerst meldde, dan staat de naam van het medium in de tekst, met een link naar het verhaal: "Volgens de Leeuwarder Courant (…) trekt de club een nieuwe spits aan."
  Zo weet de lezer waar het vandaan komt, en gaat hij door naar de journalist (principe 4).
- **Schrijf in eigen woorden.**
  Neem geen alinea's over van een ander.
  Een korte zin tussen aanhalingstekens kan, met de naam van de bron erbij.
  Een kop van een ander citeer je zoals hij is gepubliceerd, ook met SC Heerenveen met hoofdletters (zie _sc Heerenveen met kleine letters_ in `beslissingen.md`).
- **Eigen tekst schrijft de club als sc Heerenveen**, met een kleine s en c, ook aan het begin van een zin.
- **Alles komt van onze server** (principe 3).
  Een link naar een andere site mag, want die volgt de lezer pas na een klik.
  Een afbeelding of een video van een ander kan niet: de opmaak kent ze niet.
- **Geen foto's.**
  Een artikel heeft nog geen foto's: ze komen later, met de naam van de maker erbij en alleen als we toestemming hebben (principe 2).

Schrijf in gewone woorden, op taalniveau B1, zoals de rest van de site.
Wie het artikel schrijft, leest het ook na: een tweede lezer is er nog niet (die komt met #40).

## Een artikel in de database zetten

Dit is de weg tot #264 klaar is.
Open phpMyAdmin op de host, kies de database van de site en ga naar het tabblad SQL.
Lokaal werkt `docker compose exec mariadb mariadb fansite`, en dan eerst `SET NAMES utf8mb4;`, zodat de accenten goed aankomen.

### 1. Zoek het nummer van je account

Het artikel hoort bij een account van het beheer (zie _De inlog van het beheer_ in `beslissingen.md`).
Zoek het nummer op:

```sql
SELECT id, email, role, disabled_at FROM admin_users;
```

Kies het account dat aanstaat (`disabled_at` is leeg) en schrijf de `id` op.
Dat nummer komt in `created_by`.
Er komt geen e-mailadres in het artikel.

### 2. Zet het artikel als concept

Zonder `published_at` is het artikel een concept: het staat op geen enkele pagina.
Zet de teksten tussen enkele aanhalingstekens.
Een enkel aanhalingsteken in de tekst schrijf je dubbel (`l''ordre`), en een backslash laat je weg, want die heeft in MariaDB een eigen betekenis.
Een nieuwe regel mag gewoon in de tekst staan.

```sql
INSERT INTO articles (slug, title, intro, body, author, created_by)
VALUES (
  '<adres>',
  '<titel>',
  '<intro>',
  '<tekst>',
  '<auteur>',
  <nummer van het account>
);
```

Het adres moet uniek zijn en mag alleen kleine letters, cijfers en enkele streepjes hebben.
Wijst de database een deel af, dan zegt ze welk.
Een tekst die te lang is voor `title`, `intro`, `slug` of `author` wordt niet stil afgekapt: de opdracht faalt.

### 3. Kijk het na en publiceer

Een concept kun je nog niet op de site bekijken: het voorbeeld komt met #264.
Zet het artikel daarom eerst op acceptatie, publiceer het daar en lees het na.
Acceptatie heeft een eigen database en staat niet in de zoekmachines.
Zet het artikel daarna met dezelfde opdrachten in de database van productie.

Publiceer met de tijd van nu:

```sql
UPDATE articles
SET published_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
WHERE slug = '<adres>';
```

Een `published_at` na het moment van nu telt als concept totdat dat moment komt.
Zo kun je een artikel dat vooruit gepland is zetten: `published_at = '2026-11-01 08:00:00'`, in UTC.
Dat is twee uur eerder dan de klok in Nederland in de zomer en één uur eerder in de winter.

Op `/redactie/<adres>` staat het artikel meteen, en op de homepage de kaart, als dit het nieuwste gepubliceerde artikel is.
De pagina en de kaart komen elke keer uit de database, dus er is geen wachttijd.

### 4. Verander of trek in

Verander de tekst, en zet `updated_at` erbij:

```sql
UPDATE articles
SET body = '<nieuwe tekst>', updated_at = UTC_TIMESTAMP()
WHERE slug = '<adres>';
```

Trek een artikel in door `published_at` leeg te maken.
Het is dan een concept en staat nergens meer, ook niet in de sitemap.
Zet er later weer een tijd in om het terug te zetten.

```sql
UPDATE articles
SET published_at = NULL, updated_at = UTC_TIMESTAMP()
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

## Voor wie de code leest

- De tabel heet `articles` (zie `packages/db/src/schema.ts`), en de vragen ernaar staan in `packages/db/src/queries.ts`: `findPublishedArticle`, `findNewestArticle` en `listPublishedArticles`.
  Een artikel is gepubliceerd als `published_at` gevuld is en niet na het moment van nu ligt.
- De opmaak leest `apps/site/src/article-text.ts`, en `apps/site/src/ArticleText.tsx` maakt er elementen van.
  Er is geen `dangerouslySetInnerHTML`, en de tests (`article-text.test.tsx`) proberen HTML, `javascript:`-adressen, `//evil.example` en teksten van een miljoen tekens.
- De pagina is `apps/site/src/app/redactie/[slug]/page.tsx`, de kaart staat in `apps/site/src/app/page.tsx`, en beide gebruiken de componenten `Article` en `ArticleCard` van het designsysteem.
- De testgegevens staan in `apps/site/e2e/articles.ts`: een artikel, een concept en een artikel voor later.
  Op acceptatie zet de seed geen artikel: de eigenaar zet het eerste artikel zelf, met de opdrachten hierboven.
