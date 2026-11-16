#!/usr/bin/env python3
"""Vul een Word-document in en plaats de handtekening.

Gebruik:
    python3 vul_docx.py invoer.docx opdracht.json uitvoer.docx

Opdrachtbestand (JSON):
{
  "vervangingen": {
    "{{naam}}": "Jan Jansen",
    "Naam: ____________": "Naam: Jan Jansen",
    "[datum]": "13 augustus 2026"
  },
  "handtekeningen": [
    {
      "bestand": "assets/handtekening.png",
      "anker": "{{handtekening}}",     // deze tekst wordt vervangen door de afbeelding
      "breedte_cm": 4.5
    },
    {
      "bestand": "assets/handtekening.png",
      "anker": "Handtekening opdrachtnemer",
      "positie": "onder",              // nieuwe alinea direct onder de ankeralinea
      "anker_nr": 1,
      "breedte_cm": 4.5
    }
  ]
}

Zoekteksten worden over run-grenzen heen gevonden: Word knipt een zin vaak op in
losse stukjes, waardoor een gewone zoek-en-vervang mislukt. Dit script voegt die
stukjes eerst samen.
"""
import argparse
import copy
import json
import os
import sys

import docx
from docx.shared import Cm


# ------------------------------------------------------- alinea's verzamelen

def alle_alineas(document):
    """Alinea's uit hoofdtekst, tabellen (ook genest), kop- en voetteksten."""
    gezien = []

    def uit_container(container):
        for p in container.paragraphs:
            gezien.append(p)
        for tabel in getattr(container, "tables", []):
            for rij in tabel.rows:
                for cel in rij.cells:
                    uit_container(cel)

    uit_container(document)
    for sectie in document.sections:
        uit_container(sectie.header)
        uit_container(sectie.footer)
        if sectie.different_first_page_header_footer:
            uit_container(sectie.first_page_header)
            uit_container(sectie.first_page_footer)
    return gezien


# ------------------------------------------------------- vervangen over runs

def vervang_in_alinea(alinea, zoek, vervang):
    """Vervang alle voorkomens van `zoek` in deze alinea. Behoudt de opmaak van
    de run waarin de treffer begint. Geeft het aantal vervangingen terug."""
    aantal = 0
    while True:
        runs = alinea.runs
        if not runs:
            return aantal
        volledig = "".join(r.text for r in runs)
        pos = volledig.find(zoek)
        if pos < 0:
            return aantal

        eind = pos + len(zoek)
        # Bepaal per run welk deel van de treffer erin valt.
        cursor = 0
        eerste = None
        for r in runs:
            begin_run, eind_run = cursor, cursor + len(r.text)
            cursor = eind_run
            if eind_run <= pos or begin_run >= eind:
                continue  # run raakt de treffer niet
            voor = r.text[: max(0, pos - begin_run)]
            na = r.text[max(0, eind - begin_run):] if eind_run > eind else ""
            if eerste is None:
                eerste = r
                r.text = voor + vervang + na
            else:
                r.text = voor + na
        aantal += 1


def vervang_overal(document, vervangingen, log):
    alineas = alle_alineas(document)
    for zoek, vervang in vervangingen.items():
        totaal = 0
        for alinea in alineas:
            totaal += vervang_in_alinea(alinea, zoek, str(vervang))
        if totaal:
            log.append(f"vervangen: {zoek!r} -> {str(vervang)!r} ({totaal}x)")
        else:
            log.append(f"WAARSCHUWING: {zoek!r} niet gevonden in het document")


# ------------------------------------------------------- handtekening

def lege_kopie_alinea(alinea):
    """Nieuwe, lege alinea direct onder `alinea`, met dezelfde stijl."""
    nieuw_xml = copy.deepcopy(alinea._p)
    for kind in list(nieuw_xml):
        if not kind.tag.endswith("}pPr"):
            nieuw_xml.remove(kind)
    alinea._p.addnext(nieuw_xml)
    return docx.text.paragraph.Paragraph(nieuw_xml, alinea._parent)


def plaats_handtekening(document, spec, log):
    bestand = spec["bestand"]
    if not os.path.exists(bestand):
        sys.exit(f"FOUT: handtekeningbestand niet gevonden: {bestand}")
    breedte = Cm(float(spec.get("breedte_cm", 4.5)))
    anker = spec.get("anker")
    positie = spec.get("positie", "vervang")
    nr = int(spec.get("anker_nr", 1))

    alineas = alle_alineas(document)

    if anker is None:  # onderaan het document
        doel = document.add_paragraph()
        doel.add_run().add_picture(bestand, width=breedte)
        log.append("handtekening onderaan het document geplaatst")
        return True

    treffer = 0
    for alinea in alineas:
        if anker not in alinea.text:
            continue
        treffer += 1
        if treffer != nr:
            continue

        if positie == "vervang":
            # Zet het anker om in een lege plek en plak de afbeelding daar.
            vervang_in_alinea(alinea, anker, "")
            doel_run = alinea.runs[-1] if alinea.runs else alinea.add_run()
            doel_run.add_picture(bestand, width=breedte)
        elif positie == "onder":
            nieuw = lege_kopie_alinea(alinea)
            nieuw.add_run().add_picture(bestand, width=breedte)
        elif positie == "achter":
            alinea.add_run(" ").add_picture(bestand, width=breedte)
        else:
            sys.exit(f"FOUT: onbekende positie {positie!r}")
        log.append(f"handtekening geplaatst bij anker {anker!r} (positie: {positie})")
        return True

    log.append(f"WAARSCHUWING: anker {anker!r} voor de handtekening niet gevonden")
    return False


# ------------------------------------------------------- CLI

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("invoer")
    ap.add_argument("opdracht")
    ap.add_argument("uitvoer")
    args = ap.parse_args()

    with open(args.opdracht, encoding="utf-8") as f:
        opdracht = json.load(f)

    document = docx.Document(args.invoer)
    log = []

    vervang_overal(document, opdracht.get("vervangingen") or {}, log)
    for spec in opdracht.get("handtekeningen") or []:
        plaats_handtekening(document, spec, log)

    document.save(args.uitvoer)
    print(f"Geschreven: {args.uitvoer}")
    for regel in log:
        print("  " + regel)

    if any(r.startswith("WAARSCHUWING") for r in log):
        print("\nEr zijn waarschuwingen. Controleer het resultaat visueel voordat je "
              "het document verstuurt.")


if __name__ == "__main__":
    main()
