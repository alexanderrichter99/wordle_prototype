#!/usr/bin/env python3
"""
Erzeugt app/js/words.js, die Liste gültiger Rateversuche, aus dem deutschen
Hunspell-Wörterbuch igerman98 (Björn Jacke, GPL-2.0 oder GPL-3.0).

Voraussetzungen:
  - unmunch aus den Hunspell-Werkzeugen (Debian/Ubuntu: apt install hunspell-tools)
  - die Wörterbuchdateien index.dic und index.aff, z. B. aus dem npm-Paket
    dictionary-de@3.0.0:  npm pack dictionary-de@3.0.0 && tar xzf dictionary-de-3.0.0.tgz

Aufruf:
  python3 tools/build-wordlist.py package/index.dic package/index.aff [--laengen 5]

Übernommen werden alle Grund- und Beugungsformen mit genau der gewünschten Länge,
die nur aus Buchstaben (inkl. ÄÖÜß) bestehen. Abkürzungen in Großbuchstaben
(z. B. NATO) werden ausgelassen. Zusammengesetzte Wörter, die Hunspell nur über
Kompositionsregeln erkennt, sind nicht enthalten.
"""
import argparse
import re
import subprocess
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LETTERS = re.compile(r"[A-Za-zÄÖÜäöüß]+")


def upper_keep_eszett(word):
    # str.upper() würde aus ß "SS" machen.
    return "".join("ß" if ch == "ß" else ch.upper() for ch in word)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dic")
    ap.add_argument("aff")
    ap.add_argument("--laengen", default="5", help="Wortlängen, z. B. 5 oder 5,6")
    ap.add_argument("--ausgabe", default=str(ROOT / "app" / "js" / "words.js"))
    args = ap.parse_args()
    lengths = {int(n) for n in args.laengen.split(",")}

    expanded = subprocess.run(["unmunch", args.dic, args.aff], capture_output=True, check=True).stdout
    words = set()
    for line in expanded.decode("utf-8", errors="replace").splitlines():
        w = unicodedata.normalize("NFC", line.strip().split("/")[0])
        if len(w) not in lengths or not LETTERS.fullmatch(w):
            continue
        if w.isupper() or any(ch.isupper() for ch in w[1:]):
            continue  # Abkürzungen und Schreibweisen wie "iPhone"
        words.add(upper_keep_eszett(w))

    body = " ".join(sorted(words))
    Path(args.ausgabe).write_text(
        "/*\n"
        " * Gültige Rateversuche (" + str(len(words)) + " Wörter, Längen " + ",".join(map(str, sorted(lengths))) + ").\n"
        " * Erzeugt mit tools/build-wordlist.py aus dem Hunspell-Wörterbuch igerman98\n"
        " * (de_DE, Version 20161207, Copyright (C) 1999-2016 Björn Jacke),\n"
        " * lizenziert unter GNU GPL Version 2 oder 3. Nicht von Hand bearbeiten;\n"
        " * zusätzliche Wörter gehören in config.js (extraWords).\n"
        " */\n"
        "window.ADVENT_WORDS = \"" + body + "\";\n",
        encoding="utf-8",
    )
    print(f"{len(words)} Wörter nach {args.ausgabe} geschrieben")


if __name__ == "__main__":
    main()
