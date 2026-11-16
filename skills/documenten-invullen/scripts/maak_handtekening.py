#!/usr/bin/env python3
"""Maak van een foto of scan van een handtekening een nette PNG met een
transparante achtergrond: alleen de pennenstreek blijft over.

Gebruik:
    python3 maak_handtekening.py foto.jpg handtekening.png [--kleur 14184A] [--drempel 0.2]

Werkt het best met een donkere pen op wit papier. Ongelijke belichting (een
schaduw over de foto) wordt weggerekend. Bekijk het resultaat altijd zelf
voordat je het gebruikt.
"""
import argparse
import sys

try:
    import numpy as np
    from PIL import Image, ImageFilter, ImageOps
except ImportError:
    sys.exit("FOUT: installeer eerst Pillow en numpy: pip install pillow numpy")


def al_transparant(im):
    """Is dit al een uitgesneden handtekening met een echte transparante achtergrond?"""
    if im.mode not in ("RGBA", "LA"):
        return False
    alpha = np.asarray(im.getchannel("A"))
    return (alpha < 16).mean() > 0.2


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("invoer")
    ap.add_argument("uitvoer")
    ap.add_argument("--kleur", default="14184A", help="inktkleur als hex, standaard donkerblauw")
    ap.add_argument("--drempel", type=float, default=0.2,
                    help="hoe donker iets moet zijn om als inkt te tellen (0..1); hoger bij een grauwe foto")
    a = ap.parse_args()

    try:
        kleur = tuple(int(a.kleur.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    except (ValueError, IndexError):
        sys.exit("FOUT: --kleur moet een hexkleur zijn, bijvoorbeeld 14184A")

    im = ImageOps.exif_transpose(Image.open(a.invoer))
    if max(im.size) > 2400:
        schaal = 2400 / max(im.size)
        im = im.resize((round(im.width * schaal), round(im.height * schaal)), Image.LANCZOS)

    if al_transparant(im):
        alpha = np.asarray(im.getchannel("A")).astype(np.float32) / 255
    else:
        grijs = im.convert("RGB").convert("L")
        # achtergrond schatten op een verkleinde, sterk vervaagde kopie, zodat
        # een schaduw of ongelijke belichting wordt weggerekend
        klein = grijs.resize((max(8, grijs.width // 8), max(8, grijs.height // 8)), Image.BILINEAR)
        klein = klein.filter(ImageFilter.MaxFilter(5))
        klein = klein.filter(ImageFilter.GaussianBlur(max(klein.size) / 10))
        achtergrond = np.asarray(klein.resize(grijs.size, Image.BILINEAR)).astype(np.float32)
        licht = np.asarray(grijs).astype(np.float32)
        inkt = 1 - np.clip(licht / np.maximum(achtergrond, 1), 0, 1)
        laag = a.drempel
        hoog = max(float(np.percentile(inkt, 99.7)), laag + 0.15)
        alpha = np.clip((inkt - laag) / (hoog - laag), 0, 1)
        # losse spikkels weghalen
        masker = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))
        alpha = np.asarray(masker).astype(np.float32) / 255

    ys, xs = np.where(alpha > 0.15)
    if len(xs) < 50:
        sys.exit("FOUT: geen handtekening gevonden. Is de pen donker genoeg en het papier wit? "
                 "Probeer een lagere --drempel, bijvoorbeeld 0.12.")
    marge = max(4, round(0.02 * max(xs.max() - xs.min(), ys.max() - ys.min())))
    x0, x1 = max(xs.min() - marge, 0), min(xs.max() + marge + 1, alpha.shape[1])
    y0, y1 = max(ys.min() - marge, 0), min(ys.max() + marge + 1, alpha.shape[0])
    alpha = alpha[y0:y1, x0:x1]

    uit = np.zeros(alpha.shape + (4,), dtype=np.uint8)
    uit[..., 0], uit[..., 1], uit[..., 2] = kleur
    uit[..., 3] = (alpha * 255).astype(np.uint8)
    Image.fromarray(uit, "RGBA").save(a.uitvoer)

    h, w = alpha.shape
    dekking = float((alpha > 0.15).mean())
    print(f"Handtekening opgeslagen: {a.uitvoer} ({w} x {h} px, verhouding {w / h:.2f} : 1)")
    if w < 600:
        print("LET OP: minder dan 600 px breed. Hij kan korrelig worden; vraag om een scherpere foto van dichterbij.")
    if dekking > 0.35:
        print("LET OP: meer dan een derde van het beeld telt als inkt. Waarschijnlijk is de achtergrond niet egaal "
              "(lijntjespapier, schaduw, tafelblad). Probeer een hogere --drempel of vraag om een nieuwe foto.")
    if w / h < 0.6 or w / h > 8:
        print("LET OP: ongebruikelijke verhouding. Staat de foto op zijn kant, of staat er meer op dan de handtekening?")


if __name__ == "__main__":
    main()
