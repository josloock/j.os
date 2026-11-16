#!/usr/bin/env python3
"""Zet een ingevuld document om in afbeeldingen, zodat het resultaat visueel
gecontroleerd kan worden voordat het verstuurd wordt.

Gebruik:
    python3 controleer.py document.pdf|document.docx [--map controle/] [--dpi 110]

Print de paden van de gemaakte PNG's. Bekijk die daarna met de Read-tool:
staat de handtekening op de juiste plek, valt niets over de tekst heen,
zijn alle velden gevuld?
"""
import argparse
import glob
import os
import subprocess
import sys
import tempfile


def naar_pdf(pad, werkmap):
    if pad.lower().endswith(".pdf"):
        return pad
    subprocess.run(
        ["soffice", "--headless", "--convert-to", "pdf", "--outdir", werkmap, pad],
        check=True, capture_output=True, timeout=180,
    )
    naam = os.path.splitext(os.path.basename(pad))[0] + ".pdf"
    uit = os.path.join(werkmap, naam)
    if not os.path.exists(uit):
        sys.exit("FOUT: omzetten naar PDF is mislukt (is LibreOffice beschikbaar?)")
    return uit


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("bestand")
    ap.add_argument("--map", default="controle")
    ap.add_argument("--dpi", type=int, default=110)
    args = ap.parse_args()

    os.makedirs(args.map, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        pdf = naar_pdf(args.bestand, tmp)
        voorvoegsel = os.path.join(args.map, "pagina")
        for oud in glob.glob(voorvoegsel + "-*.png"):
            os.remove(oud)
        subprocess.run(["pdftoppm", "-png", "-r", str(args.dpi), pdf, voorvoegsel],
                       check=True, capture_output=True, timeout=180)

    paden = sorted(glob.glob(voorvoegsel + "-*.png"))
    if not paden:
        sys.exit("FOUT: geen afbeeldingen gemaakt")
    print(f"{len(paden)} pagina('s) klaar om te bekijken:")
    for p in paden:
        print("  " + p)


if __name__ == "__main__":
    main()
