#!/usr/bin/env python3
"""Vul een PDF in: formuliervelden, losse tekst en de handtekening-afbeelding.

Gebruik:
    python3 vul_pdf.py invoer.pdf opdracht.json uitvoer.pdf [--plat]

Opdrachtbestand (JSON):
{
  "velden": {                          // alleen voor PDF's met echte formuliervelden
    "naam_veld": "Jan Jansen",
    "akkoord_vinkje": true             // true/false voor checkboxes
  },
  "annotaties": [                      // voor platte PDF's en voor de handtekening
    {
      "pagina": 1,
      "type": "tekst",
      "waarde": "Jan Jansen",
      "anker": "Naam:",                // tekst waarnaast geschreven wordt
      "dx": 6, "dy": 0,                // verschuiving t.o.v. het anker, in punten
      "grootte": 10
    },
    {
      "pagina": 2,
      "type": "tekst",
      "waarde": "Amsterdam",
      "rect": [120, 640, 300, 655]     // of exacte coordinaten (y=0 is BOVEN)
    },
    {
      "pagina": 2,
      "type": "afbeelding",
      "bestand": "assets/handtekening.png",
      "anker": "Handtekening",
      "dy": -38,                       // negatief = hoger op de pagina
      "breedte": 130                   // in punten; hoogte volgt de verhouding
    },
    { "pagina": 1, "type": "vinkje", "rect": [95, 300, 105, 310] }
  ]
}

Ankers: het script zoekt de tekst op de opgegeven pagina. Standaard wordt de
eerste treffer gebruikt; met "anker_nr": 2 kies je de tweede treffer.
Met "anker_positie": "rechts" (standaard), "onder" of "boven" bepaal je waar
het invulveld ten opzichte van het anker ligt.
"""
import argparse
import json
import os
import sys

import pymupdf
from PIL import Image

STANDAARD_LETTERGROOTTE = 10
STANDAARD_FONT = "helv"


def bijsnijden_transparant(png_pad, werkmap):
    """Snijd lege (transparante) randen van de handtekening weg, zodat de
    afbeelding strak op de handtekeninglijn kan worden gezet."""
    img = Image.open(png_pad)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    kader = img.split()[-1].getbbox()
    if kader is None:
        return png_pad, img.width / max(img.height, 1)
    bijgesneden = img.crop(kader)
    uit = os.path.join(werkmap, "handtekening_bijgesneden.png")
    bijgesneden.save(uit)
    return uit, bijgesneden.width / max(bijgesneden.height, 1)


def vind_anker(page, tekst, nr=1):
    """Geeft (rect, aantal_treffers). rect is None als de treffer niet bestaat."""
    treffers = page.search_for(tekst)
    nr = max(1, int(nr))
    if nr > len(treffers):
        return None, len(treffers)
    return treffers[nr - 1], len(treffers)


def horizontale_lijnen(page, min_lengte=30.0):
    """Alle horizontale lijnen op de pagina als (x0, x1, y), van boven naar
    beneden. Zowel echte lijnen als zeer platte rechthoeken tellen mee - veel
    formulieren tekenen hun invullijnen als dunne gevulde balkjes."""
    lijnen = []
    for tekening in page.get_drawings():
        for item in tekening["items"]:
            if item[0] == "l":
                p1, p2 = item[1], item[2]
                if abs(p1.y - p2.y) < 1.0 and abs(p1.x - p2.x) >= min_lengte:
                    lijnen.append((min(p1.x, p2.x), max(p1.x, p2.x), (p1.y + p2.y) / 2))
            elif item[0] == "re":
                r = item[1]
                if r.height < 2.5 and r.width >= min_lengte:
                    lijnen.append((r.x0, r.x1, (r.y0 + r.y1) / 2))
    return sorted(lijnen, key=lambda t: t[2])


def lijn_onder(page, ankerrect, zoekafstand=160.0):
    """De eerste horizontale lijn onder het anker die er horizontaal bij hoort."""
    kandidaten = []
    for x0, x1, y in horizontale_lijnen(page):
        # Vanaf halverwege het label (een invullijn naast een label ligt op
        # dezelfde regel) tot 'zoekafstand' eronder.
        if y < ankerrect.y0 + 2 or y > ankerrect.y1 + zoekafstand:
            continue
        # De lijn moet doorlopen tot voorbij de rechterkant van het label,
        # anders hoort hij bij een ander veld links ervan.
        if x1 <= ankerrect.x1:
            continue
        # ... en niet ver rechts van het label beginnen.
        if x0 < ankerrect.x0 - 40 or x0 > ankerrect.x1 + 260:
            continue
        # Sorteren op: hoogste lijn eerst, dan de lijn die het dichtst bij het
        # einde van het label begint.
        kandidaten.append((round(y, 1), abs(x0 - ankerrect.x1), x0, x1, y))
    if not kandidaten:
        return None
    _, _, x0, x1, y = min(kandidaten)
    return x0, x1, y


def doelrect(page, annotatie, hoogte_hint=12.0, breedte_hint=140.0,
             verhouding=None, log=None):
    """Bepaal waar de tekst of afbeelding komt."""
    if "rect" in annotatie:
        return pymupdf.Rect(*annotatie["rect"])

    anker = annotatie.get("anker")
    if not anker:
        raise ValueError("Annotatie heeft 'rect' of 'anker' nodig: %r" % annotatie)

    nr = annotatie.get("anker_nr", 1)
    gevonden, aantal = vind_anker(page, anker, nr)
    if gevonden is None:
        raise LookupError(
            f"Anker {anker!r} gevraagd als treffer {nr} op pagina "
            f"{annotatie.get('pagina')}, maar er zijn {aantal} treffer(s). "
            "Controleer de spelling, kies een ander anker_nr, of gebruik 'rect'."
        )

    positie = annotatie.get("anker_positie", "rechts")
    dx = float(annotatie.get("dx", 6 if positie == "rechts" else 0))
    dy = float(annotatie.get("dy", 0))

    if positie == "oplijn":
        lijn = lijn_onder(page, gevonden, float(annotatie.get("zoekafstand", 160)))
        if lijn is None:
            raise LookupError(
                f"Geen invullijn gevonden onder anker {anker!r} op pagina "
                f"{annotatie.get('pagina')}. Gebruik anker_positie 'onder' met een "
                "eigen dy, of geef 'rect' op."
            )
        lx0, lx1, ly = lijn
        marge = float(annotatie.get("marge", 3))
        x0 = lx0 + (dx if dx else 4)
        onder = ly - marge + dy

        # Past de afbeelding tussen het label en de lijn? Zo niet: verklein hem,
        # anders loopt de handtekening dwars door de tekst erboven.
        if verhouding:
            ruimte = onder - (gevonden.y1 + 3)
            if 10 < ruimte < hoogte_hint:
                if log is not None:
                    log.append(f"handtekening verkleind naar {ruimte:.0f}pt hoog "
                               f"om binnen de ruimte boven de lijn te passen")
                hoogte_hint = ruimte
                breedte_hint = ruimte * verhouding

        return pymupdf.Rect(x0, onder - hoogte_hint, x0 + breedte_hint, onder)

    if positie == "rechts":
        x0 = gevonden.x1 + dx
        y0 = gevonden.y0 + dy
        return pymupdf.Rect(x0, y0, x0 + breedte_hint, y0 + hoogte_hint)
    if positie == "onder":
        x0 = gevonden.x0 + dx
        y0 = gevonden.y1 + (dy or 4)
        return pymupdf.Rect(x0, y0, x0 + breedte_hint, y0 + hoogte_hint)
    if positie == "boven":
        x0 = gevonden.x0 + dx
        y1 = gevonden.y0 + (dy or -4)
        return pymupdf.Rect(x0, y1 - hoogte_hint, x0 + breedte_hint, y1)
    raise ValueError(f"Onbekende anker_positie: {positie!r}")


def herstel_vinkje_lettertype(doc):
    """PyMuPDF geeft het ZapfDingbats-vinkje soms WinAnsiEncoding mee, waardoor
    het vinkje in veel PDF-lezers als het cijfer 3 verschijnt. Die encoding
    hoort er niet te staan - ZapfDingbats heeft een eigen tekenset."""
    hersteld = 0
    for xref in range(1, doc.xref_length()):
        try:
            if "ZapfDingbats" not in (doc.xref_get_key(xref, "BaseFont")[1] or ""):
                continue
            soort, waarde = doc.xref_get_key(xref, "Encoding")
        except Exception:
            continue
        if soort != "null" and "WinAnsi" in str(waarde):
            doc.xref_set_key(xref, "Encoding", "null")
            hersteld += 1
    return hersteld


def vul_formuliervelden(doc, velden, log):
    if not velden:
        return
    resterend = dict(velden)
    for page in doc:
        for w in page.widgets() or []:
            if w.field_name not in resterend:
                continue
            waarde = resterend.pop(w.field_name)
            if w.field_type == pymupdf.PDF_WIDGET_TYPE_CHECKBOX:
                w.field_value = bool(waarde)
            elif w.field_type == pymupdf.PDF_WIDGET_TYPE_RADIOBUTTON:
                w.field_value = str(waarde)
            else:
                w.field_value = "" if waarde is None else str(waarde)
            w.update()
            log.append(f"veld {w.field_name!r} = {waarde!r}")
    for naam in resterend:
        log.append(f"WAARSCHUWING: veld {naam!r} bestaat niet in dit document")


def plaats_annotaties(doc, annotaties, werkmap, log):
    handtekening_cache = {}
    for a in annotaties:
        paginanr = int(a.get("pagina", 1))
        page = doc[paginanr - 1]
        soort = a.get("type", "tekst")

        if soort == "tekst":
            grootte = float(a.get("grootte", STANDAARD_LETTERGROOTTE))
            rect = doelrect(page, a, hoogte_hint=grootte * 1.45,
                            breedte_hint=float(a.get("breedte", 200)))
            waarde = str(a.get("waarde", ""))
            page.insert_text(
                (rect.x0, rect.y1 - grootte * 0.22),
                waarde,
                fontsize=grootte,
                fontname=a.get("font", STANDAARD_FONT),
                color=(0, 0, 0),
            )
            log.append(f"p{paginanr} tekst {waarde!r} op ({rect.x0:.0f}, {rect.y0:.0f})")

        elif soort == "vinkje":
            rect = doelrect(page, a, hoogte_hint=10, breedte_hint=10)
            grootte = float(a.get("grootte", min(rect.width, rect.height) * 1.1)) or 10
            page.insert_text((rect.x0 + 1, rect.y1 - 1.5), "X",
                             fontsize=grootte, fontname=STANDAARD_FONT, color=(0, 0, 0))
            log.append(f"p{paginanr} vinkje op ({rect.x0:.0f}, {rect.y0:.0f})")

        elif soort == "afbeelding":
            bestand = a["bestand"]
            if bestand not in handtekening_cache:
                handtekening_cache[bestand] = bijsnijden_transparant(bestand, werkmap)
            pad, verhouding = handtekening_cache[bestand]
            breedte = float(a.get("breedte", 130))
            hoogte = float(a.get("hoogte", breedte / verhouding))
            if "rect" in a:
                rect = pymupdf.Rect(*a["rect"])
            else:
                rect = doelrect(page, a, hoogte_hint=hoogte, breedte_hint=breedte,
                                verhouding=verhouding, log=log)
                breedte, hoogte = rect.width, rect.height
            page.insert_image(rect, filename=pad, keep_proportion=True, overlay=True)
            log.append(f"p{paginanr} handtekening ({breedte:.0f}x{hoogte:.0f}pt) "
                       f"op ({rect.x0:.0f}, {rect.y0:.0f})")

        else:
            raise ValueError(f"Onbekend annotatietype: {soort!r}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("invoer")
    ap.add_argument("opdracht")
    ap.add_argument("uitvoer")
    ap.add_argument("--plat", action="store_true",
                    help="maak formuliervelden onbewerkbaar (aanbevolen voor verzending)")
    args = ap.parse_args()

    with open(args.opdracht, encoding="utf-8") as f:
        opdracht = json.load(f)

    werkmap = os.path.dirname(os.path.abspath(args.uitvoer)) or "."
    doc = pymupdf.open(args.invoer)
    log = []

    try:
        vul_formuliervelden(doc, opdracht.get("velden") or {}, log)
        plaats_annotaties(doc, opdracht.get("annotaties") or [], werkmap, log)
    except (LookupError, ValueError) as e:
        sys.exit(f"FOUT: {e}")

    if herstel_vinkje_lettertype(doc):
        log.append("weergave van aangevinkte vakjes gecorrigeerd")

    if args.plat:
        for page in doc:
            for w in page.widgets() or []:
                w.field_flags |= 1  # alleen-lezen
                w.update()
        log.append("formuliervelden op alleen-lezen gezet")

    doc.save(args.uitvoer, garbage=3, deflate=True)
    doc.close()

    print(f"Geschreven: {args.uitvoer}")
    for regel in log:
        print("  " + regel)


if __name__ == "__main__":
    main()
