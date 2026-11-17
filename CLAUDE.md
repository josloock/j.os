# J.OS

De site os.josloock.nl: de toepassingen van Jos Loock voor AI en Menselijke
productiviteit. Statische site zonder bouwstap; de map is de site.

## Opbouw

- `index.html`: homepage met de levende bol en daaronder het overzicht met
  blokken. Elk blok heeft een thema (Werk, Geld besparen, ...).
- `begin-hier/index.html`: uitleg en spelregels. De bol op de homepage en de
  het eerste blok in het overzicht openen deze pagina.
- `documenten-invullen/index.html`, `huisstijl/index.html`: de pagina van een
  toepassing. Elke toepassing krijgt zo'n eigen map. Een toepassing kan twee
  routes hebben (tabbladen), elk met eigen stappen en een eigen prompt.
- `assets/site.css`, `assets/os.js`: huisstijl en de bol. Het lettertype staat
  in `assets/fonts` en wordt niet van buiten geladen.
- `money-wrapped/`: een toepassing die in de browser rekent in plaats van in een
  AI. Zie "Money Wrapped" hieronder.
- `skills/<naam>/`: de bron van een weggeefbare skill.
- `downloads/<naam>.zip`: wat bezoekers downloaden. Gemaakt uit `skills/`.
- `CNAME`, `.nojekyll`, `robots.txt`: voor GitHub Pages. De site staat op
  noindex: hij is bedoeld voor abonnees van de nieuwsbrief en hoort niet in
  zoekmachines.

## Een toepassing toevoegen

1. Kopieer de map `documenten-invullen/` en pas de teksten aan. Volgorde van
   een toepassingspagina: introductie, demo, acties, goed om te weten. De
   introductie is alleen een titel en één duidelijke belofte. Met welke AI het
   werkt staat niet bovenaan; dat hoort bij "Begin hier".
2. Voeg in `index.html` een `<li class="toc-item">` toe aan het overzicht
   "Toepassingen", met het thema linksboven. Met een link in de titel is hij live en krijgt hij een gouden
   punt. Zonder link (en met `class="toc-item soon"`) staat hij op "Binnenkort".
3. De bol heeft naast het startpunt plek voor zes punten op een breed scherm en
   drie op een telefoon (`WIDE` en `NARROW` in `assets/os.js`). Live
   toepassingen krijgen als eerste een plek; wat niet past staat alleen in de
   lijst. Verander je de plekken, controleer dan dat labels de bol en elkaar
   niet raken.

## Een skill bijwerken

Pas de bron in `skills/<naam>/` aan en bouw de download opnieuw:

```bash
cd skills && rm -f ../downloads/documenten-invullen.zip && zip -qr ../downloads/documenten-invullen.zip documenten-invullen -x '*/__pycache__/*' '*.pyc'
```

In een weggeefbare skill staan nooit persoonsgegevens, een handtekening of een
paraaf. `profiel.md` is leeg (maak hem met
`scripts/maak_persoonlijke_skill.py --leeg profiel.md`). Controleer de zip
daarop voordat hij live gaat.

## Money Wrapped

Je sleept een export van ING in de pagina en krijgt één kort financieel
jaaroverzicht: vier cijfers, de drie acties waar je het meeste aan hebt, en je
abonnementen met bij elk waar je opzegt. De rest zit ingeklapt onder "Meer
inzicht". Houd het kort: geen lange pagina en geen verhaal in dia's. Alles
wordt in de browser uitgerekend. Er gaat niets naar
een server of een AI. Dat is de belofte van deze toepassing: voeg dus nooit iets
toe dat gegevens verstuurt. De pagina dwingt dit af met een Content-Security-
Policy (`connect-src 'none'`). Verander je het kleine script in de `<head>`, dan
moet de hash in die regel mee veranderen.

- `regels.js`: categorieën, de namen van winkels en abonnementen, en onderaan de
  opzegpagina per abonnement (`OPZEGGEN`). Hier voeg je een winkel toe. Bovenaan
  staat hoe een regel werkt. Zet alleen een opzegpagina erbij die je hebt
  gecontroleerd en die op de site van de aanbieder zelf staat. Staat er geen,
  dan toont de pagina een zoeklink.
- `engine.js`: leest het bestand, herkent vaste lasten en maakt de acties, de
  belangrijkste eerst (`maakActies`). Geen schermcode, dus te testen met `node`.
- `demo.js`: het voorbeeld met verzonnen cijfers, in het formaat van ING.
- `app.js` en `wrapped.css`: wat je ziet.

- `bouw_download.py`: maakt `downloads/money-wrapped.html`, de losse versie die
  bezoekers opslaan en zonder internet openen. Alles zit in dat ene bestand.

Na elke wijziging in `money-wrapped/` of `assets/` bouw je de download opnieuw,
anders loopt hij achter op de pagina:

```bash
python3 money-wrapped/bouw_download.py
```

Wat tussen `<!-- alleen-site -->` en `<!-- /alleen-site -->` staat, komt niet in
de download (de tabbladen en de knop naar de download zelf).

Testen: open `money-wrapped/index.html#voorbeeld`, dan staat het voorbeeld
meteen open. Open de download ook een keer als bestand, met de verbinding uit.
Gebruik nooit echte bankgegevens in tests of in de repo.

Op de homepage staat hij nog op "Binnenkort". Live zetten: geef de titel in
`index.html` een link naar `money-wrapped/index.html`, haal `soon` weg en zet
hem in de pager van de andere toepassingen.

## Huisstijl

- Papier `#F2EEE6`, inkt `#1C1712`, espresso `#1F1A14`. Eén goud accent: de
  getekende onderstreping (`#C9A23A`) en oker (`#A57820`) voor cijfers en punten.
- Alleen Newsreader, rechtop.
- Geen gedachtestreepjes in teksten. Korte zinnen.
- Jos schrijft zijn teksten zelf. Neem zijn woorden letterlijk over en stel een
  andere formulering apart voor.

## Controleren

Bekijk elke wijziging op 1280 en 390 pixels breed voordat hij live gaat:
`python3 -m http.server 8770` in deze map en dan een schermafbeelding.
