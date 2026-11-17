# J.OS

De site os.josloock.nl: de toepassingen van Jos Loock voor AI en Menselijke
productiviteit. Statische site zonder bouwstap; de map is de site.

## Opbouw

- `index.html`: homepage met de levende bol en de inhoudsopgave.
- `begin-hier/index.html`: uitleg en spelregels. De bol op de homepage en de
  eerste regel van de inhoudsopgave openen deze pagina.
- `documenten-invullen/index.html`: de pagina van een toepassing. Elke
  toepassing krijgt zo'n eigen map.
- `assets/site.css`, `assets/os.js`: huisstijl en de bol. Het lettertype staat
  in `assets/fonts` en wordt niet van buiten geladen.
- `skills/<naam>/`: de bron van een weggeefbare skill.
- `downloads/<naam>.zip`: wat bezoekers downloaden. Gemaakt uit `skills/`.
- `CNAME`, `.nojekyll`, `robots.txt`: voor GitHub Pages. De site staat op
  noindex: hij is bedoeld voor abonnees van de nieuwsbrief en hoort niet in
  zoekmachines.

## Een toepassing toevoegen

1. Kopieer de map `documenten-invullen/` en pas de teksten aan. Volgorde van
   een toepassingspagina: introductie, demo, acties, goed om te weten.
2. Voeg in `index.html` een `<li class="toc-item">` toe aan de lijst
   "Toepassingen". Met een link in de titel is hij live en krijgt hij een gouden
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
