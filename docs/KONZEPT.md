# Konzept und Architektur

## Architekturentscheidung (kurz)

**Empfehlung: eine rein statische Webanwendung aus HTML, CSS und JavaScript, ohne Build-Schritt, ohne Framework, ohne Backend.**

Die Anwendung besteht aus wenigen Dateien, die jeder interne Webserver ausliefern kann. Der Spielstand liegt im `localStorage` des Browsers. Es gibt keine Datenbank, keine Benutzerkonten, keine externen Ressourcen und keine Netzwerkaufrufe nach dem Laden der Seite.

```
Browser des Mitarbeiters
 ├─ index.html, styles.css, *.js   ← vom internen Webserver (einmalig geladen)
 ├─ Datum: Systemuhr → Europe/Berlin (Intl-API, ohne Bibliothek)
 └─ Spielstand: localStorage (nur auf diesem Gerät, in diesem Browser)
```

### Vergleich

| Kriterium | Statische Web-App (empfohlen) | Web-App mit Backend |
|---|---|---|
| Infrastruktur | Beliebiger Webserver/Fileshare-Hosting | Server-Runtime, ggf. Datenbank, Betrieb, Patching |
| Freigabeaufwand IT | Gering (nur Auslieferung statischer Dateien) | Hoch (Anwendungsbetrieb, Schutzbedarf, Schnittstellen) |
| Personenbezogene Daten | Keine | Je nach Funktion (Login, Rangliste) |
| Spielstand | Lokal pro Browser | Zentral, geräteübergreifend möglich |
| Rangliste / Auswertung | Nicht möglich | Möglich |
| Lösungen geheim halten | Nicht möglich (siehe unten) | Möglich (Prüfung serverseitig) |
| Wartung | Dateien austauschen | Deployments, Monitoring, Updates |

Warum kein React/Vite: Der Funktionsumfang (Kalender, Raster, Tastatur) ist mit rund 600 Zeilen Vanilla-JavaScript gut beherrschbar. Ein Framework würde einen Build-Schritt, `node_modules` und eine Prüfung zusätzlicher Abhängigkeiten nach sich ziehen, ohne für Mitarbeitende spürbaren Mehrwert.

Die Skripte sind bewusst klassische Skripte (keine ES-Module), damit die App auch direkt per Doppelklick (`file://`) und auf Plattformen ohne korrekte MIME-Typen für Module läuft.

## Bausteine

| Datei | Zweck |
|---|---|
| `app/index.html` | Seitengerüst (Startseite, Spielansicht) |
| `app/css/styles.css` | Gestaltung, Farben als CSS-Variablen, Hell/Dunkel |
| `app/js/config.js` | **Zentrale Konfiguration**: Bankname, Logo, Farben, Jahr, Versuche, Testmodus |
| `app/js/puzzles.js` | **Die 24 Rätsel**: Lösungswort, Thema, Fun Fact |
| `app/js/logic.js` | Reine Spiellogik ohne DOM (Auswertung, Datum, Speicherung) – per Node getestet |
| `app/js/app.js` | Oberfläche, Eingabe, Ansichten |
| `tests/` | Unit-Tests (Node) und Browser-Test (Playwright, nur Entwicklung) |
| `tools/build-single.mjs` | Optional: alles in **eine** HTML-Datei bündeln |

## Wichtige fachliche Regeln

- **Freischaltung:** Türchen *n* ist ab dem *n*. Tag des Aktionsmonats 00:00 Uhr deutscher Zeit (Europe/Berlin) spielbar, regulär im Dezember (`month` in `config.js`, für den Probelauf Oktober). Nach dem 24. bleiben alle Türchen offen, davor ist alles gesperrt.
- **Abschluss:** Sind alle 24 Türchen gespielt (gelöst oder aufgelöst), zeigt die Startseite einen Glückwunsch mit Weihnachtsgrüßen.
- **Themenhinweis:** Jedes Rätsel hat eine Kategorie für die Pflege; im Spiel ist sie ausgeblendet, weil sie die Lösung zu stark eingrenzt.
- **Gesperrte Türchen** sind sichtbar, aber nicht anklickbar; auch ein direkter Link (`#/tag/20`) wird abgefangen.
- **Auswertung** in zwei Durchläufen: erst exakte Treffer (grün), dann vorhandene Buchstaben (gelb) nur so oft, wie sie im Lösungswort noch übrig sind. Doppelte Buchstaben werden dadurch korrekt behandelt.
- **Umlaute und ß** sind eigene Buchstaben (Ä ≠ A). ß wird nicht zu „SS“ umgewandelt.
- **Barrierearmut:** Zusätzlich zur Farbe zeigt jedes Feld ein Symbol (✓ richtige Stelle, ↔ falsche Stelle, · nicht enthalten), Screenreader erhalten eine Textansage je Versuch, alles ist per Tastatur bedienbar.
- **Wortprüfung:** Standardmäßig wird jede Eingabe aus Buchstaben in passender Länge akzeptiert. Es gibt kein Wörterbuch (eine freie deutsche Wortliste in guter Qualität müsste lizenzrechtlich geprüft werden). Optional kann eine eigene Liste erlaubter Wörter hinterlegt werden (`config.js` → `allowedWords`).

## Grenzen einer statischen Lösung

**Lösungen sind auslesbar.** Alle 24 Lösungswörter werden mit `puzzles.js` an den Browser ausgeliefert. Wer die Entwicklertools öffnet, kann sie finden. Die Oberfläche zeigt zukünftige Lösungen nie an (auch nicht im HTML oder in Tooltips). Eine Verschleierung der Datei (z. B. Base64) wurde bewusst weggelassen: Sie würde die Pflege erschweren und wäre trotzdem **kein** Schutz.

Für ein freiwilliges Mitarbeiterspiel ohne Preise ist das vertretbar. Wenn es Gewinne gibt oder Manipulationsschutz zwingend ist, braucht es eine serverseitige Komponente: Der Browser schickt nur den Rateversuch, der Server liefert die Farbrückmeldung und gibt das Wort eines Tages erst ab dessen Datum heraus. Erst damit lassen sich auch die Systemuhr des Rechners (siehe Testmodus/Datum) und lokale Spielstände nicht mehr manipulieren.

**Datum kommt vom Rechner.** Wer die Systemuhr verstellt, kann Türchen früher öffnen. Auch das lässt sich nur serverseitig verhindern.

## Spielstände und Datenschutz

- Gespeichert werden nur die eigenen Rateversuche je Tag im `localStorage` (Schlüssel `adventskalender-<Jahr>`). Kein Name, keine Kennung, keine Übertragung.
- Der Spielstand ist **nicht** auf anderen Geräten oder in anderen Browsern verfügbar.
- Löschen der Browserdaten, private Fenster oder Richtlinien, die Browserdaten beim Abmelden löschen (z. B. auf VDI/Citrix-Arbeitsplätzen), entfernen den Fortschritt.
- Ist der Speicher gesperrt, läuft das Spiel trotzdem; ein Hinweis erklärt, dass der Fortschritt nicht gespeichert wird.

### Erweiterungsoption Rangliste (nicht umgesetzt)

Falls später eine Rangliste gewünscht ist, ist der datenschutzfreundlichste Weg:

1. Kleines internes Backend (z. B. eine Funktion auf der vorhandenen Intranet-Plattform) mit serverseitiger Lösungsprüfung.
2. Teilnahme nur nach aktivem Opt-in, mit selbst gewähltem **Pseudonym** statt Klarnamen; Anmeldung über das bestehende SSO nur zur Missbrauchsvermeidung, ohne das Pseudonym mit der Identität im Frontend zu verknüpfen.
3. Gespeichert werden nur Pseudonym, Tag und Anzahl Versuche; Löschung nach Ende der Aktion (z. B. 31. Januar).
4. Vorab: Abstimmung mit Datenschutz und ggf. Betriebs-/Personalrat, da Spielverhalten von Beschäftigten ausgewertet würde (Verhaltens-/Leistungskontrolle).

## Offene Entscheidungen

Diese Punkte beeinflussen die Umsetzung, sind aber mit Annahmen vorbelegt und in `config.js` änderbar:

1. **Hosting-Weg** – hängt von der IT ab (siehe README, Abschnitt „Interne Bereitstellung“). Annahme: vorhandener interner Webserver.
2. **Zeitraum** – vorbelegt mit Oktober 2026 als Probelauf; für die Aktion `month: 12`.
3. **Wortlänge** – 5 Buchstaben, 6 Versuche. Jedes Rätsel kann eine eigene Länge haben; das Raster passt sich an.
4. **Wortprüfung gegen Wörterbuch** – aus (jede Buchstabenfolge erlaubt). Mit eigener Liste aktivierbar.
5. **Corporate Design** – Erscheinungsbild an den Webauftritt der BayernLB angelehnt (Textlogo, geschätzte Farben, Systemschrift). Offizielles Logo, Farbwerte und ggf. Hausschrift (lokal eingebunden, ohne externe Quellen) kommen aus dem Corporate Design.
6. **Gewinnspiel?** – Falls ja, ist ein Backend nötig (siehe „Grenzen“).
