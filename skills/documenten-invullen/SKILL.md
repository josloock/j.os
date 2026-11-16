---
name: "documenten-invullen"
description: "Vul een ontvangen document automatisch in met de vaste gegevens van de gebruiker, plaats zijn handtekening, en meld wat er nog ontbreekt en waar hij op moet letten voordat hij tekent. Gebruik deze skill zodra iemand een Word- of PDF-document deelt dat ingevuld, ondertekend, geparafeerd of geretourneerd moet worden: bij zinnen als \"vul dit voor me in\", \"kun je dit invullen\", \"wil je dit tekenen\", \"hier moet mijn handtekening onder\", \"vul dit formulier in\", \"onderteken dit contract\", \"fill in this form\", \"sign this document\", of bij ontvangen NDA's, opdrachtbevestigingen, verwerkersovereenkomsten, offertes, machtigingen en aanmeldformulieren. Ook bij \"stel documenten invullen in\" of \"stel me in\"."
---

# Document invullen en ondertekenen

Doel: een ontvangen document komt binnen, en gaat er ingevuld én ondertekend
weer uit, met een kort rapport erbij over wat nog ontbreekt en wat er in het
document opvalt.

Werk altijd op een kopie in de werkmap. Wijzig nooit het bestand van de
gebruiker zelf, en overschrijf nooit het origineel.

`<skillmap>` hieronder is de map waarin dit bestand staat. Voer de scripts
vanuit je werkmap uit met het volledige pad, bijvoorbeeld
`python3 <skillmap>/scripts/inventariseer.py`.

Deze skill komt uit J.OS van Jos Loock (josloock.nl).

## Vaste regels

- **Verzin nooit gegevens.** Staat een waarde niet in `profiel.md` en niet in
  het gesprek, dan blijft het veld leeg en komt het in het rapport onder
  "Nog invullen door jou". Een geraden KvK-nummer of adres is erger dan een
  leeg veld.
- **Vul nooit iets in dat om een BSN, paspoortnummer of DigiD vraagt.** Meld
  die velden en laat de gebruiker ze zelf invullen.
- **Controleer altijd visueel** voordat je oplevert. Een handtekening die over
  de tekst valt of een veld dat naast de lijn staat, is onbruikbaar.
- **Behoud de opmaak.** Vervang tekst in het bestaande document; bouw het
  document niet opnieuw op.
- **De gegevens van de gebruiker zijn van de gebruiker.** Gebruik ze alleen om
  zijn documenten in te vullen en om zijn persoonlijke skill te maken. Stuur ze
  nergens anders heen en herhaal ze niet onnodig in het gesprek.
- **Schrijf gewoon Nederlands.** Korte zinnen, geen jargon. Reageer in de taal
  van de gebruiker als die geen Nederlands schrijft.

## Stap 0: eerste keer instellen

Lees `<skillmap>/profiel.md`. Staat bij "Volledige naam" een echte naam, sla
deze stap dan over en ga naar stap 1.

Staat daar nog `NOG INVULLEN`, dan gebruikt iemand de skill voor het eerst.
Loods hem er rustig doorheen. Het hele instellen kost een paar minuten.

**1. Leg in twee of drie zinnen uit wat er gaat gebeuren.** Bijvoorbeeld:
"Dit is de eerste keer, dus ik heb één keer je gegevens en je handtekening
nodig. Daarna maak ik jouw persoonlijke versie van deze skill, zodat je ze
nooit meer hoeft in te vullen. Je gegevens blijven in je eigen Claude-account."

**2. Vraag in één bericht om de gegevens.** Zeg erbij dat alles overgeslagen
mag worden: wat ontbreekt, vraag je later wel als een document erom vraagt.

- volledige naam (en roepnaam als die anders is)
- straat en huisnummer, postcode en woonplaats
- e-mailadres en telefoonnummer
- plaats waar hij meestal tekent (vaak de woonplaats)
- of hij ook namens een bedrijf tekent. Zo ja: bedrijfsnaam, rechtsvorm,
  KvK-nummer, vestigingsadres, zijn functie, en eventueel het btw-nummer

Vraag niet om een BSN, paspoortnummer of DigiD, en niet om een geboortedatum of
IBAN tenzij de gebruiker ze zelf geeft of het document erom vraagt.

**3. Vraag om de handtekening.** Een foto of scan van een handtekening met een
donkere pen op wit papier, zonder lijntjes, van dichtbij en recht van boven.
Maak er een bruikbare afbeelding van:

```bash
python3 <skillmap>/scripts/maak_handtekening.py foto.jpg handtekening.png
```

Bekijk `handtekening.png` zelf. Is alleen de pennenstreek over, scherp en
zonder vlekken of randen? Zo niet: probeer een andere `--drempel` (hoger bij
een grauwe foto, lager bij een lichte pen) of vraag om een betere foto. Laat de
gebruiker het resultaat zien en vraag of het klopt. Teken nooit zelf een
handtekening. Wil de gebruiker er nu geen geven, ga dan door zonder en meld in
het rapport dat hij nog met de hand moet tekenen.

Parafeert hij ook documenten, vraag dan op dezelfde manier om een paraaf en
maak daar `paraaf.png` van.

**4. Vul het document in.** Is er een document gedeeld, ga dan nu door met
stap 1 en gebruik de gegevens uit het gesprek alsof ze in het profiel staan.
Zo ziet de gebruiker meteen resultaat. Is er geen document gedeeld, sla dit
over.

**5. Maak de persoonlijke skill.** Schrijf de gegevens naar `gegevens.json`
(de sleutels staan bovenin `scripts/maak_persoonlijke_skill.py`; tekent hij
niet namens een bedrijf, zet dan `"geen_bedrijf": true`) en voer uit:

```bash
python3 <skillmap>/scripts/maak_persoonlijke_skill.py gegevens.json \
  --handtekening handtekening.png --uit documenten-invullen.zip
```

Voeg `--paraaf paraaf.png` toe als die er is, en laat `--handtekening` weg als
er geen handtekening is. Lever `documenten-invullen.zip` op als download en
leg uit wat de gebruiker ermee doet:

1. Ga in Claude naar Customize en dan Skills.
2. Verwijder de skill "documenten-invullen" die er nu staat.
3. Klik op de plus, kies Create skill en dan Upload a skill, en kies het
   bestand dat hij net heeft gekregen.

Zeg erbij: vanaf het volgende gesprek hoeft hij alleen nog een document te
delen en "vul dit voor me in" te zeggen. Wil hij later iets wijzigen, dan zegt
hij "stel documenten invullen opnieuw in".

Vraagt de gebruiker later om opnieuw instellen of om een gegeven te wijzigen,
doorloop dan dezelfde stappen. Neem wat al in `profiel.md` staat over, vraag
alleen naar wat verandert, en gebruik de bestaande `assets/handtekening.png`
tenzij hij een nieuwe geeft.

## Stap 1: profiel, handtekening en paraaf laden

Lees `<skillmap>/profiel.md`. Dat zijn de vaste gegevens. Regels met
`NOG INVULLEN` tellen als ontbrekend; regels met `PER KEER VRAGEN` vul je nooit
zelf in.

Tekent de gebruiker namens een bedrijf? Gebruik dan de paragraaf **Zakelijk**.
Noemt het document zelf een bedrijfsnaam of KvK-nummer, controleer dan of die
exact kloppen met het profiel en meld elk verschil: een verkeerde
tenaamstelling is een echt probleem. Kun je niet met zekerheid afleiden of hij
privé of namens het bedrijf tekent, laat de naam dan leeg en vraag het.

De handtekening staat in `<skillmap>/assets/handtekening.png` (of, tijdens het
instellen, in je werkmap). Meet eerst zijn verhouding, want die bepaalt hoe
hoog hij wordt: bij 130 pt breed en een verhouding van 1,7 : 1 is hij 77 pt
hoog, en dat is fors. Op een krappe plek verkleint `vul_pdf.py` hem
automatisch; in Word moet je zelf op de hoogte letten.

Staat er geen handtekening en heeft de gebruiker er in dit gesprek geen
gegeven, vraag er dan één keer om (zie stap 0, punt 3).

Moet er geparafeerd worden, gebruik dan `<skillmap>/assets/paraaf.png` als die
er is. Standaardmaat: 32 pt breed in een PDF, 1,1 cm breed in Word. Is er geen
paraaf, vraag er dan om of meld in het rapport dat de gebruiker nog met de hand
moet parafen. Teken nooit zelf een paraaf.

## Stap 2: het document inventariseren

```bash
python3 <skillmap>/scripts/inventariseer.py <document> --json inventaris.json
```

Dit geeft: documenttype, aantal pagina's, echte formuliervelden, plekken die op
een invulveld lijken (`{{...}}`, `[...]`, invullijnen, aankruisvakjes), ankers
voor handtekening/naam/datum/plaats, en de volledige tekst.

Lees daarna de volledige tekst zelf door. De inventarisatie vindt de
*plekken*; jij bepaalt de *betekenis*: welk veld om welk gegeven vraagt, en of
er zinnen zijn die aangevuld moeten worden zonder dat er een lijntje staat.

Is het een `.doc` (oud formaat)? Converteer eerst:
`soffice --headless --convert-to docx <bestand>`.

Ontbreekt `pymupdf` of `python-docx`, installeer ze dan eerst:
`pip install pymupdf python-docx` (zo nodig met `--break-system-packages`).

**Gedraaide pagina's.** Scans hebben vaak een paginarotatie van 90 of 270 graden.
`vul_pdf.py` rekent daar niet mee: een handtekening komt dan gedraaid en op de
verkeerde plek te staan. Controleer dit bij elke PDF en zet de pagina's zo nodig
eerst recht. Het document ziet er daarna precies hetzelfde uit, en alle
coördinaten kloppen weer met wat je op de pagina ziet:

```python
import pymupdf
doc = pymupdf.open("invoer.pdf")
if any(p.rotation for p in doc):
    for p in doc:
        p.remove_rotation()
    doc.save("invoer-recht.pdf")  # werk verder met dit bestand
```

## Stap 3: de route kiezen

| Wat de inventarisatie zegt | Route |
|---|---|
| `.docx` | Stap 4a: zoek en vervang in Word |
| PDF **met** formuliervelden | Stap 4b: velden vullen |
| PDF **zonder** formuliervelden, mét tekstlaag | Stap 4c: tekst op ankers plaatsen |
| PDF zonder tekstlaag (scan) | Stap 4d: visueel bepalen |

## Stap 4a: Word invullen

Maak een opdrachtbestand en voer uit:

```bash
python3 <skillmap>/scripts/vul_docx.py invoer.docx opdracht.json uitvoer.docx
```

```json
{
  "vervangingen": {
    "{{naam}}": "…",
    "Naam: ____________": "Naam: …",
    "[datum]": "13 augustus 2026"
  },
  "handtekeningen": [
    { "bestand": "handtekening.png", "anker": "{{handtekening}}",
      "positie": "vervang", "breedte_cm": 4.5 }
  ]
}
```

Geef bij `bestand` het volledige pad naar de handtekening.

Aandachtspunten:

- Zoekteksten worden over run-grenzen heen gevonden. Word knipt zinnen intern
  op in stukjes; dat lost het script zelf op.
- Neem bij invullijnen het **hele** patroon mee in de zoektekst
  (`"IBAN ____________"`), niet alleen de underscores, anders raak je de
  verkeerde regel. Vervang door label + waarde, zodat het label blijft staan.
- Elke zoektekst die niet gevonden wordt, geeft een WAARSCHUWING. Los die op en
  ga niet door met een half ingevuld document.
- `positie`: `"vervang"` (de ankertekst wordt de afbeelding), `"onder"` (nieuwe
  alinea eronder), `"achter"` (achter de bestaande tekst).

## Stap 4b: PDF met formuliervelden

```bash
python3 <skillmap>/scripts/vul_pdf.py invoer.pdf opdracht.json uitvoer.pdf --plat
```

```json
{
  "velden": { "naam": "…", "akkoord": true },
  "annotaties": [
    { "pagina": 2, "type": "afbeelding", "bestand": "handtekening.png",
      "anker": "Handtekening", "anker_positie": "onder", "dy": 6, "breedte": 140 }
  ]
}
```

Gebruik de veldnamen exact zoals de inventarisatie ze geeft. Checkboxes krijgen
`true`/`false`; keuzerondjes de waarde uit `keuzes`.

`--plat` zet de velden op alleen-lezen, zodat de ontvanger niets meer kan
wijzigen. Doe dat standaard, tenzij de gebruiker het document nog wil kunnen
aanpassen.

Handtekeningvelden in een PDF-formulier zijn géén gewone velden: vul die niet,
maar plaats de afbeelding eroverheen als annotatie.

## Stap 4c: platte PDF

Zelfde script, alleen `annotaties`. Coördinaten zijn punten met **y=0 bovenaan**.

```json
{ "annotaties": [
  { "pagina": 1, "type": "tekst", "anker": "Naam:", "anker_positie": "oplijn", "waarde": "…" },
  { "pagina": 1, "type": "tekst", "waarde": "Utrecht", "rect": [120, 640, 300, 655] },
  { "pagina": 1, "type": "vinkje", "rect": [95, 300, 105, 310] },
  { "pagina": 1, "type": "afbeelding", "bestand": "handtekening.png",
    "anker": "Handtekening", "anker_positie": "oplijn", "breedte": 130 }
] }
```

- **Begin altijd met `"anker_positie": "oplijn"`.** Het script zoekt dan zelf de
  invullijn die bij het label hoort en zet de tekst of handtekening er precies
  bovenop. Dat werkt zowel voor labels met een lijn ernaast (`Plaats: ______`)
  als voor een handtekeninglijn onder een kopje. Is de ruimte tussen het label
  en de lijn te krap voor de handtekening, dan verkleint het script hem
  automatisch zodat hij nooit door de tekst erboven loopt. Dat staat dan in de
  uitvoer, en je kunt de breedte daarna handmatig bijstellen als er toch ruimte
  is.
- Vindt hij geen lijn (het document werkt met witruimte in plaats van lijntjes),
  val dan terug op `anker_positie` `rechts`, `onder` of `boven`. `dx`/`dy`
  verschuiven vanaf het anker; `dy` negatief is hoger op de pagina.
- Komt een ankerwoord meerdere keren voor, gebruik dan `anker_nr`. De foutmelding
  vertelt hoeveel treffers er zijn.
- Kies een anker dat uniek en compleet is (`"Aldus overeengekomen te"` in plaats
  van `"te"`).
- Lukt het met ankers niet, bepaal de coördinaten dan visueel zoals in stap 4d.

## Stap 4d: gescande PDF

Er is geen tekstlaag, dus ankers werken niet. Zet de pagina's om in
afbeeldingen, bekijk ze, en bepaal de coördinaten visueel:

```bash
python3 <skillmap>/scripts/controleer.py invoer.pdf --map paginas --dpi 150
```

Reken pixels om naar punten: `punt = pixel * 72 / dpi`. Werk daarna met `rect`.
Bij een scan is één controleronde extra nodig: plaats eerst één veld, bekijk
het resultaat, corrigeer de offset, en vul dan de rest.

## Stap 4e: parafen

Parafeer als het document daarom vraagt: er staat een veld `Paraaf:` op de
pagina's, de tekst vraagt om elke pagina te parafen, of de wederpartij heeft zelf
al elke pagina geparafeerd. Dan krijgt elke pagina met zo'n veld de paraaf, niet
alleen de laatste. Een paraaf vervangt de handtekening niet: op de tekenpagina
staan ze allebei.

Waar de paraaf komt:

- **Leeg paraafveld.** Zet hem op de lijn naast of onder het label. In een PDF
  met tekstlaag: `"anker": "Paraaf", "anker_positie": "oplijn", "breedte": 32`.
- **De wederpartij staat al op de lijn.** Zet de paraaf van de gebruiker direct
  links van het label, niet eroverheen. Met `x0` de linkerkant van het label en
  `lijn` de hoogte van de lijn: `"rect": [x0 - 36, lijn - 30, x0 - 4, lijn + 7]`.
- **Er wordt om parafen gevraagd, maar er is geen veld.** Rechtsonder op elke
  pagina, binnen de marge en boven de voettekst.
- **Scan.** Zelfde regels, met `rect` uit stap 4d. Het label staat op elke
  gescande pagina net iets anders, dus meet elke pagina apart.
- **Word.** Staat het paraafveld in de voettekst, dan is één plaatsing genoeg:
  hij verschijnt op elke pagina. `vul_docx.py` doorzoekt kop- en voetteksten
  vanzelf. Gebruik `"breedte_cm": 1.1`.

## Stap 5: visueel controleren (verplicht)

```bash
python3 <skillmap>/scripts/controleer.py uitvoer.pdf --map controle
```

Bekijk élke pagina-afbeelding zelf en let op:

- staat de handtekening op de handtekeninglijn, niet erboven of eroverheen?
- valt ingevulde tekst binnen de lijntjes en niet over bestaande tekst?
- is elk veld dat gevuld had moeten worden ook echt gevuld?
- is de handtekening leesbaar en niet uitgerekt of piepklein?
- staat de paraaf op elke pagina waar dat gevraagd is, rechtop en zonder iemand
  anders zijn paraaf te bedekken?

Klopt het niet: pas `dx`/`dy`/`breedte` aan en draai opnieuw. Lever nooit een
document op dat je niet hebt gezien.

## Stap 6: opleveren

Geef het bestand een duidelijke naam:
`<oorspronkelijke naam>-ingevuld-<jjjj-mm-dd>.<ext>`. Lever het op als download.
Lever een PDF in principe als PDF terug en een Word-document als Word.
Converteer alleen als de gebruiker daarom vraagt of als het document expliciet
om een PDF vraagt.

Schrijf daarna dit rapport in het gesprek: kort, in deze volgorde, en sla lege
kopjes over.

```
**Ingevuld:** <in één zin: welke velden, en dat de handtekening en eventuele parafen staan>

**Nog invullen door jou**
- <veld> (pagina X): <waarom ik het niet kon invullen>

**Let op in dit document**
- <bevinding met citaat of artikelnummer>
```

Voor het derde kopje: lees `<skillmap>/references/documentadvies.md` en
beoordeel het document daarop. Noem alleen wat er werkelijk in staat, met de
vindplaats erbij. Drie tot vijf punten is genoeg: kies wat financieel of
juridisch het zwaarst weegt. Is er niets bijzonders, schrijf dan één zin dat
het document standaard oogt. Dit is geen juridisch advies; zeg dat erbij als de
bevindingen zwaar zijn.

Sluit af met een aanbod om aanpassingen te doen (andere plek voor de
handtekening, ander formaat, ontbrekende gegevens alsnog invullen).

## Nieuwe gegevens onthouden

Geeft de gebruiker tijdens het invullen een gegeven dat nog niet in `profiel.md`
staat en dat vaker terugkomt (KvK-nummer, IBAN, adres)? Gebruik het voor dit
document. Een skill kan zichzelf niet bijwerken, dus bied aan om een nieuwe
persoonlijke versie te maken met het gegeven erin (stap 0, punt 5), die de
gebruiker dan opnieuw uploadt.
