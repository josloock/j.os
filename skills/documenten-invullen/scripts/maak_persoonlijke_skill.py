#!/usr/bin/env python3
"""Maak de persoonlijke versie van deze skill: dezelfde skill, maar met de
gegevens en de handtekening van de gebruiker erin. De gebruiker uploadt dat
zip-bestand één keer bij zijn skills en hoeft daarna nooit meer iets in te
vullen.

Gebruik:
    python3 maak_persoonlijke_skill.py gegevens.json
        [--handtekening handtekening.png] [--paraaf paraaf.png]
        [--uit documenten-invullen.zip]
    python3 maak_persoonlijke_skill.py --leeg profiel.md   # schrijf een leeg profiel

gegevens.json is een plat object. Alle sleutels zijn optioneel; wat ontbreekt
komt als NOG INVULLEN in het profiel:
{
  "volledige_naam": "Jan Jansen", "voorletters": "J.", "roepnaam": "Jan",
  "achternaam": "Jansen", "geboortedatum": "", "geboorteplaats": "",
  "nationaliteit": "Nederlandse",
  "straat_huisnummer": "Voorbeeldstraat 1", "postcode": "1234 AB",
  "woonplaats": "Utrecht", "land": "Nederland",
  "telefoon": "06 12 34 56 78", "email": "jan@voorbeeld.nl",
  "geen_bedrijf": false,
  "bedrijfsnaam": "", "rechtsvorm": "", "kvk": "", "btw": "",
  "zakelijk_adres": "", "functie": "", "bevoegdheid": "",
  "iban": "", "tenaamstelling": "",
  "plaats_ondertekening": "Utrecht", "hoedanigheid": ""
}
"""
import argparse
import json
import os
import sys
import zipfile

SKILLNAAM = "documenten-invullen"
LEEG = "NOG INVULLEN"

PERSOONLIJK = [
    ("volledige_naam", "Volledige naam"),
    ("voorletters", "Voorletters"),
    ("roepnaam", "Roepnaam"),
    ("achternaam", "Achternaam"),
    ("geboortedatum", "Geboortedatum"),
    ("geboorteplaats", "Geboorteplaats"),
    ("nationaliteit", "Nationaliteit"),
]
CONTACT = [
    ("straat_huisnummer", "Straat en huisnummer"),
    ("postcode", "Postcode"),
    ("woonplaats", "Woonplaats"),
    ("land", "Land"),
    ("telefoon", "Telefoon"),
    ("email", "E-mailadres"),
]
ZAKELIJK = [
    ("bedrijfsnaam", "Bedrijfsnaam"),
    ("rechtsvorm", "Rechtsvorm"),
    ("kvk", "KvK-nummer"),
    ("btw", "Btw-identificatienummer"),
    ("zakelijk_adres", "Vestigingsadres"),
    ("functie", "Functie"),
    ("bevoegdheid", "Tekenbevoegdheid"),
]
FINANCIEEL = [
    ("iban", "IBAN"),
    ("tenaamstelling", "Tenaamstelling"),
]
ONDERTEKENEN = [
    ("plaats_ondertekening", "Plaats van ondertekening"),
    ("hoedanigheid", "Hoedanigheid bij de handtekening"),
]
ALLE_VELDEN = PERSOONLIJK + CONTACT + ZAKELIJK + FINANCIEEL + ONDERTEKENEN


def schoon(waarde):
    """Eén regel, zonder tekens die de tabel breken."""
    tekst = str(waarde if waarde is not None else "").replace("|", "/")
    return " ".join(tekst.split())


def tabel(velden, gegevens, standaard=LEEG):
    regels = ["| Gegeven | Waarde |", "|---|---|"]
    for sleutel, label in velden:
        waarde = schoon(gegevens.get(sleutel, ""))
        regels.append(f"| {label} | {waarde or standaard} |")
    return "\n".join(regels)


def render_profiel(gegevens):
    geen_bedrijf = bool(gegevens.get("geen_bedrijf"))
    zakelijk = tabel(ZAKELIJK, gegevens, "NIET VAN TOEPASSING" if geen_bedrijf else LEEG)
    return f"""# Profiel

Deze gegevens gebruik je om documenten in te vullen. Staat een waarde op
`{LEEG}` of `PER KEER VRAGEN`, vul hem dan **niet** zelf in, maar meld hem in
het rapport onder "Nog invullen door jou".

Staat bij "Volledige naam" nog `{LEEG}`, dan is deze skill nog niet ingesteld.
Volg dan eerst "Eerste keer instellen" in `SKILL.md`.

## Persoonlijk

{tabel(PERSOONLIJK, gegevens)}

## Contact

{tabel(CONTACT, gegevens)}

## Zakelijk

Alleen gebruiken als de gebruiker namens een bedrijf tekent. Noemt het document
zelf een bedrijfsnaam of KvK-nummer, controleer dan of die exact overeenkomen
met deze tabel en meld elk verschil.

{zakelijk}

## Financieel

{tabel(FINANCIEEL, gegevens)}

## Bijzonder gevoelig: nooit zelf invullen

| Gegeven | Waarde |
|---|---|
| BSN | PER KEER VRAGEN |
| Paspoort- of ID-nummer | PER KEER VRAGEN |
| DigiD | NOOIT |

## Voorkeuren bij ondertekenen

{tabel(ONDERTEKENEN, gegevens)}

| Onderwerp | Voorkeur |
|---|---|
| Datumnotatie | voluit, bijvoorbeeld 13 augustus 2026 |
| Datum in strakke formuliervelden | 13-08-2026 |
| Breedte handtekening | 4,5 cm in Word / 130 pt in PDF |
"""


def is_png(pad):
    with open(pad, "rb") as f:
        return f.read(8) == b"\x89PNG\r\n\x1a\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("gegevens", nargs="?", help="JSON-bestand met de gegevens van de gebruiker")
    ap.add_argument("--handtekening", help="PNG met transparante achtergrond")
    ap.add_argument("--paraaf", help="PNG met transparante achtergrond (optioneel)")
    ap.add_argument("--uit", default=f"{SKILLNAAM}.zip", help="naam van het zip-bestand")
    ap.add_argument("--leeg", metavar="PAD", help="schrijf alleen een leeg profiel naar PAD")
    a = ap.parse_args()

    if a.leeg:
        with open(a.leeg, "w", encoding="utf-8") as f:
            f.write(render_profiel({}))
        print(f"Leeg profiel geschreven: {a.leeg}")
        return

    if not a.gegevens:
        ap.error("geef een gegevens.json op (of gebruik --leeg)")
    with open(a.gegevens, encoding="utf-8") as f:
        gegevens = json.load(f)
    if not isinstance(gegevens, dict):
        sys.exit("FOUT: gegevens.json moet een object zijn")
    if not schoon(gegevens.get("volledige_naam", "")):
        sys.exit("FOUT: 'volledige_naam' ontbreekt. Zonder naam is de skill niet ingesteld.")

    for vlag, pad in (("--handtekening", a.handtekening), ("--paraaf", a.paraaf)):
        if pad and not os.path.isfile(pad):
            sys.exit(f"FOUT: {vlag}: bestand niet gevonden: {pad}")
        if pad and not is_png(pad):
            sys.exit(f"FOUT: {vlag}: dit is geen PNG. Maak hem eerst met maak_handtekening.py.")

    skillmap = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    vervangen = {"profiel.md"}
    if a.handtekening:
        vervangen.add("assets/handtekening.png")
    if a.paraaf:
        vervangen.add("assets/paraaf.png")

    aantal = 0
    with zipfile.ZipFile(a.uit, "w", zipfile.ZIP_DEFLATED) as z:
        for basis, mappen, bestanden in os.walk(skillmap):
            mappen[:] = sorted(m for m in mappen if m != "__pycache__" and not m.startswith("."))
            for naam in sorted(bestanden):
                if naam.endswith(".pyc") or naam.startswith("."):
                    continue
                pad = os.path.join(basis, naam)
                rel = os.path.relpath(pad, skillmap).replace(os.sep, "/")
                if rel in vervangen:
                    continue
                z.write(pad, f"{SKILLNAAM}/{rel}")
                aantal += 1
        z.writestr(f"{SKILLNAAM}/profiel.md", render_profiel(gegevens))
        aantal += 1
        if a.handtekening:
            z.write(a.handtekening, f"{SKILLNAAM}/assets/handtekening.png")
            aantal += 1
        if a.paraaf:
            z.write(a.paraaf, f"{SKILLNAAM}/assets/paraaf.png")
            aantal += 1

    ingevuld = [label for sleutel, label in ALLE_VELDEN if schoon(gegevens.get(sleutel, ""))]
    ontbreekt = [label for sleutel, label in ALLE_VELDEN if not schoon(gegevens.get(sleutel, ""))]
    if gegevens.get("geen_bedrijf"):
        zakelijke_labels = {label for _, label in ZAKELIJK}
        ontbreekt = [label for label in ontbreekt if label not in zakelijke_labels]
    print(f"Persoonlijke skill gemaakt: {a.uit} ({aantal} bestanden)")
    print(f"Ingevuld ({len(ingevuld)}): " + ", ".join(ingevuld))
    if ontbreekt:
        print(f"Nog leeg ({len(ontbreekt)}): " + ", ".join(ontbreekt))
    print("Handtekening: " + ("toegevoegd" if a.handtekening else "ONTBREEKT, de skill vraagt er per gesprek om"))
    if a.paraaf:
        print("Paraaf: toegevoegd")


if __name__ == "__main__":
    main()
