#!/usr/bin/env python3
"""Bouwt downloads/money-wrapped.html: Money Wrapped als één los bestand.

Het bestand heeft niets van buiten nodig: de opmaak, het lettertype en de code
zitten erin. Wie het opslaat, kan het zonder internet openen.

Gebruik, vanuit de map van de site:  python3 money-wrapped/bouw_download.py
Draai dit opnieuw na elke wijziging in money-wrapped/ of assets/.
"""
import base64
import hashlib
import re
from pathlib import Path

HIER = Path(__file__).resolve().parent
SITE = HIER.parent
DOEL = SITE / "downloads" / "money-wrapped.html"
ADRES = "https://os.josloock.nl/"


def lees(pad):
    return pad.read_text(encoding="utf-8")


def sha(tekst):
    return "'sha256-" + base64.b64encode(hashlib.sha256(tekst.encode("utf-8")).digest()).decode() + "'"


html = lees(HIER / "index.html")

# wat alleen op de website hoort (de tabbladen, de knop naar deze download)
html = re.sub(r"<!-- alleen-site -->.*?<!-- /alleen-site -->\n?", "", html, flags=re.S)
html = html.replace(' role="tabpanel" aria-labelledby="tab-hier"', "")

# opmaak en lettertype in het bestand zelf
font = base64.b64encode((SITE / "assets/fonts/newsreader-latin-opsz-normal.woff2").read_bytes()).decode()
css = lees(SITE / "assets/site.css") + "\n" + lees(HIER / "wrapped.css")
css = css.replace("url('fonts/newsreader-latin-opsz-normal.woff2')", "url('data:font/woff2;base64," + font + "')")

# de code in het bestand zelf
hashes = []
start = re.search(r"<script>(.*?)</script>", html, flags=re.S).group(1)
hashes.append(sha(start))


def inline(match):
    bron = lees((HIER / match.group(1)).resolve())
    assert "</script" not in bron, match.group(1)
    hashes.append(sha(bron))
    return "<script>" + bron + "</script>"


body = html[html.index("<body>"):]
body = re.sub(r'<script src="([^"]+)"></script>', inline, body)
body = body.replace('href="../index.html"', 'href="' + ADRES + '"')
body = body.replace('href="../begin-hier/index.html#spelregels"', 'href="' + ADRES + 'begin-hier/#spelregels"')

# dit bestand mag niets van buiten laden en nergens verbinding mee maken
csp = ("default-src 'none'; script-src " + " ".join(hashes) + "; style-src 'unsafe-inline'; img-src data:; "
       "font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'")

kop = """<!doctype html>
<html lang="nl" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Money Wrapped, de losse versie. Dit bestand staat op je eigen computer en maakt geen verbinding met buiten.
     De bron staat op github.com/josloock/j.os in de map money-wrapped. -->
<meta http-equiv="Content-Security-Policy" content="%s">
<title>Money Wrapped</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#F2EEE6">
<style>
%s
</style>
<script>%s</script>
</head>
""" % (csp, css, start)

uit = kop + body
for fout in ('src="', 'href="../', "url('fonts", '<link '):
    assert fout not in uit, "nog iets van buiten: " + fout
DOEL.write_text(uit, encoding="utf-8")
print("%s gebouwd, %d kB" % (DOEL.relative_to(SITE), len(uit.encode("utf-8")) // 1024))
