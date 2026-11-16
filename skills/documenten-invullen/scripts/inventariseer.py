#!/usr/bin/env python3
"""Inventariseer een document: wat moet er ingevuld worden en waar?

Gebruik:
    python3 inventariseer.py <bestand.pdf|bestand.docx> [--json uit.json]

Geeft een overzicht van:
  - documenttype en aantal pagina's
  - invulbare formuliervelden (PDF AcroForm / Word content controls)
  - plekken die op een invulveld lijken (invullijnen, puntjes, [ ], {{...}})
  - ankers voor handtekening, naam, datum, plaats
  - de volledige tekst per pagina (afgekapt), zodat de inhoud beoordeeld kan worden
"""
import argparse
import json
import os
import re
import sys

# Woorden die wijzen op een plek waar iets ingevuld of getekend moet worden.
ANKERWOORDEN = {
    "handtekening": [
        "handtekening", "ondertekening", "getekend", "ondergetekende",
        "signature", "sign here", "paraaf", "voor akkoord", "voor gezien",
    ],
    "naam": ["naam", "achternaam", "voornaam", "voorletters", "t.a.v.", "name"],
    "datum": ["datum", "date", "dagtekening", "d.d."],
    "plaats": ["plaats", "te ", "gevestigd te", "place"],
    "bedrijf": ["bedrijf", "onderneming", "handelsnaam", "kvk", "btw", "vestigingsadres"],
    "financieel": ["iban", "rekeningnummer", "bankrekening", "tenaamstelling", "incasso"],
    "contact": ["e-mail", "email", "telefoon", "mobiel", "postcode", "adres", "woonplaats"],
}

# Patronen die op een leeg invulveld lijken.
LEEGVELD_PATRONEN = [
    (r"_{3,}", "invullijn (underscores)"),
    (r"\.{5,}", "invullijn (puntjes)"),
    (r"…{2,}", "invullijn (ellipsis)"),
    (r"\{\{[^}]{1,60}\}\}", "placeholder {{...}}"),
    (r"<<[^>]{1,60}>>", "placeholder <<...>>"),
    (r"\[\s{0,3}\]", "aankruisvakje [ ]"),
    (r"\[[A-Za-z0-9 _\-]{1,40}\]", "placeholder [...]"),
    (r"\bXXX+\b", "placeholder XXX"),
    (r"\bPM\b", "nog te bepalen (PM)"),
]


def zoek_lege_velden(tekst):
    treffers = []
    for patroon, omschrijving in LEEGVELD_PATRONEN:
        for m in re.finditer(patroon, tekst):
            start = max(0, m.start() - 60)
            eind = min(len(tekst), m.end() + 30)
            context = " ".join(tekst[start:eind].split())
            treffers.append({
                "soort": omschrijving,
                "gevonden": m.group(0)[:60],
                "context": context,
            })
    return treffers


def zoek_ankers(tekst_lower):
    gevonden = {}
    for categorie, woorden in ANKERWOORDEN.items():
        raak = sorted({w for w in woorden if w in tekst_lower})
        if raak:
            gevonden[categorie] = raak
    return gevonden


# ---------------------------------------------------------------- PDF

def inventariseer_pdf(pad):
    import pymupdf

    doc = pymupdf.open(pad)
    rapport = {
        "bestand": os.path.basename(pad),
        "type": "pdf",
        "paginas": doc.page_count,
        "heeft_formuliervelden": bool(doc.is_form_pdf),
        "formuliervelden": [],
        "pagina_inhoud": [],
        "waarschuwingen": [],
    }

    for i, page in enumerate(doc, start=1):
        for w in page.widgets() or []:
            rapport["formuliervelden"].append({
                "pagina": i,
                "naam": w.field_name,
                "soort": w.field_type_string,
                "huidige_waarde": w.field_value,
                "keuzes": list(w.choice_values) if w.choice_values else None,
                "rect": [round(v, 1) for v in w.rect],
                "alleen_lezen": bool(w.field_flags & 1),
            })

    alle_tekst = []
    for i, page in enumerate(doc, start=1):
        tekst = page.get_text()
        alle_tekst.append(tekst)
        rapport["pagina_inhoud"].append({
            "pagina": i,
            "afmeting_pt": [round(page.rect.width, 1), round(page.rect.height, 1)],
            "lege_velden": zoek_lege_velden(tekst),
            "ankers": zoek_ankers(tekst.lower()),
            "tekst": tekst.strip(),
        })

    samen = "\n".join(alle_tekst).strip()
    if len(samen) < 40 * doc.page_count:
        rapport["waarschuwingen"].append(
            "Nauwelijks tekstlaag gevonden - dit is waarschijnlijk een scan. "
            "Velden moeten visueel bepaald worden (zie referenties/werkwijze-pdf.md)."
        )
    if not rapport["formuliervelden"]:
        rapport["waarschuwingen"].append(
            "Geen invulbare formuliervelden. Invullen gebeurt door tekst op coordinaten "
            "te plaatsen met vul_pdf.py."
        )
    doc.close()
    return rapport


# ---------------------------------------------------------------- DOCX

def _docx_alinea_teksten(document):
    """Alle alinea's, ook die in tabellen, kop- en voetteksten."""
    uit = []

    def loop_body(container, herkomst):
        for p in container.paragraphs:
            uit.append((herkomst, p.text))
        for t in container.tables:
            for rij in t.rows:
                for cel in rij.cells:
                    for p in cel.paragraphs:
                        uit.append((herkomst + " (tabel)", p.text))

    loop_body(document, "hoofdtekst")
    for i, sectie in enumerate(document.sections, start=1):
        loop_body(sectie.header, f"koptekst sectie {i}")
        loop_body(sectie.footer, f"voettekst sectie {i}")
    return uit


def inventariseer_docx(pad):
    import docx

    document = docx.Document(pad)
    alineas = _docx_alinea_teksten(document)
    volledige_tekst = "\n".join(t for _, t in alineas)

    rapport = {
        "bestand": os.path.basename(pad),
        "type": "docx",
        "aantal_alineas": len(alineas),
        "aantal_tabellen": len(document.tables),
        "formuliervelden": [],
        "lege_velden": [],
        "ankers": zoek_ankers(volledige_tekst.lower()),
        "tekst": volledige_tekst.strip(),
        "waarschuwingen": [],
    }

    # Content controls (structured document tags) en legacy formuliervelden.
    xml = document.element.xml
    for m in re.finditer(r'<w:alias w:val="([^"]+)"', xml):
        rapport["formuliervelden"].append({"soort": "content control", "naam": m.group(1)})
    for m in re.finditer(r'<w:ffData>.*?<w:name w:val="([^"]+)"', xml, re.S):
        rapport["formuliervelden"].append({"soort": "legacy formulierveld", "naam": m.group(1)})

    for herkomst, tekst in alineas:
        for treffer in zoek_lege_velden(tekst):
            treffer["herkomst"] = herkomst
            rapport["lege_velden"].append(treffer)

    if not rapport["formuliervelden"] and not rapport["lege_velden"]:
        rapport["waarschuwingen"].append(
            "Geen duidelijke invulmarkeringen gevonden. Lees de tekst door en bepaal "
            "zelf welke zinnen aangevuld moeten worden."
        )
    return rapport


# ---------------------------------------------------------------- CLI

def samenvatting(rapport):
    r = []
    r.append(f"Bestand: {rapport['bestand']}  ({rapport['type']})")
    if rapport["type"] == "pdf":
        r.append(f"Pagina's: {rapport['paginas']}")
    velden = rapport.get("formuliervelden", [])
    r.append(f"Invulbare formuliervelden: {len(velden)}")
    for v in velden[:80]:
        if rapport["type"] == "pdf":
            r.append(f"  - p{v['pagina']} [{v['soort']}] {v['naam']!r}"
                     + (f" keuzes={v['keuzes']}" if v.get("keuzes") else ""))
        else:
            r.append(f"  - [{v['soort']}] {v['naam']!r}")
    if len(velden) > 80:
        r.append(f"  ... en nog {len(velden) - 80} velden")

    if rapport["type"] == "pdf":
        for pagina in rapport["pagina_inhoud"]:
            lv, ank = pagina["lege_velden"], pagina["ankers"]
            if lv or ank:
                r.append(f"Pagina {pagina['pagina']}:")
                for x in lv[:25]:
                    r.append(f"  ~ {x['soort']}: ...{x['context']}...")
                if ank:
                    r.append(f"  ankers: {ank}")
    else:
        for x in rapport["lege_velden"][:40]:
            r.append(f"  ~ {x['soort']} in {x['herkomst']}: ...{x['context']}...")
        if rapport["ankers"]:
            r.append(f"  ankers: {rapport['ankers']}")

    for w in rapport.get("waarschuwingen", []):
        r.append(f"LET OP: {w}")
    return "\n".join(r)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("bestand")
    ap.add_argument("--json", help="schrijf het volledige rapport als JSON naar dit pad")
    args = ap.parse_args()

    ext = os.path.splitext(args.bestand)[1].lower()
    if ext == ".pdf":
        rapport = inventariseer_pdf(args.bestand)
    elif ext in (".docx", ".dotx", ".docm"):
        rapport = inventariseer_docx(args.bestand)
    else:
        sys.exit(f"Onbekend bestandstype: {ext}. Converteer eerst met soffice.")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(rapport, f, ensure_ascii=False, indent=2)
        print(f"Volledig rapport geschreven naar {args.json}")
    print(samenvatting(rapport))


if __name__ == "__main__":
    main()
