# Der digitale Adventskalender

Ein Wordle-Adventskalender für Mitarbeitende: vom 1. bis 24. Dezember öffnet sich täglich ein neues Worträtsel rund um Banking, Advent und Weihnachten.

> **Aktueller Stand: Probelauf im Oktober.** In `app/js/config.js` steht `month: 10`, die Türchen öffnen sich also am 1. bis 24. Oktober 2026. Für die eigentliche Aktion auf `month: 12` umstellen.

Die App ist eine **rein statische Webanwendung** (HTML, CSS, JavaScript). Sie braucht keinen Server-Code, keine Datenbank, keine Benutzerkonten und lädt keine externen Ressourcen. Der Spielstand bleibt im Browser der Spielenden.

Hintergrund und Architekturentscheidung: [docs/KONZEPT.md](docs/KONZEPT.md)

## Funktionen

- 24 Türchen, freigeschaltet nach deutscher Zeit (Europe/Berlin) im konfigurierten Monat; zukünftige Türchen sind sichtbar, aber gesperrt (auch per Direktlink)
- Wordle-Mechanik mit korrekter Behandlung doppelter Buchstaben, Umlaute Ä/Ö/Ü und ß
- Bildschirmtastatur (QWERTZ) und physische Tastatur (Buchstaben, Enter, Rücktaste, Esc = zurück)
- Farbrückmeldung zusätzlich mit Symbolen (✓ richtige Stelle, ↔ andere Stelle, ✕ nicht enthalten) und Textansagen für Screenreader
- Ergebnisansicht mit Lösungswort und Fun Fact (erst nach Abschluss sichtbar)
- Fortschritt, Statistik und Verteilung der benötigten Versuche
- Glückwunsch mit Weihnachtsgrüßen, sobald alle 24 Türchen gespielt sind
- Zwei Erscheinungsbilder: `bayernlb` (sachlich, kantig, an den Webauftritt der BayernLB angelehnt) und `standard`
- Spielstand im `localStorage`; funktioniert auch, wenn der Browser keine Speicherung erlaubt
- Responsiv (Smartphone bis Desktop), Hell- und Dunkelmodus, reduzierte Animationen bei entsprechender Systemeinstellung
- Testmodus zum Ausprobieren außerhalb der Adventszeit

## Projektstruktur

```
app/                    ← nur dieser Ordner wird bereitgestellt
  index.html
  css/styles.css
  js/config.js          ← Branding, Farben, Jahr, Versuche, Testmodus
  js/puzzles.js         ← die 24 Rätsel mit Thema und Fun Fact
  js/logic.js           ← Spiellogik ohne DOM (getestet)
  js/app.js             ← Oberfläche
  assets/logo.svg       ← Platzhalter-Logo
  assets/favicon.svg
docs/KONZEPT.md         ← Architektur, Datenschutz, Grenzen, offene Entscheidungen
tests/logic.test.js     ← Unit-Tests (Node, ohne Abhängigkeiten)
tests/e2e/              ← Browser-Tests (Playwright, nur Entwicklung)
tools/build-single.mjs  ← optional: alles in eine einzelne HTML-Datei bündeln
```

## Voraussetzungen

- **Zum Spielen und Bereitstellen:** nichts außer einem aktuellen Browser (Edge, Chrome, Firefox, Safari der letzten zwei Jahre).
- **Zum Entwickeln und Testen (optional):** Node.js ab Version 20.

## Lokaler Start (Entwicklungsrechner)

Variante A, ohne jede Installation: `app/index.html` per Doppelklick im Browser öffnen. Die App funktioniert auch über `file://`.

Variante B, mit lokalem Webserver (näher am Produktivbetrieb):

```bash
# mit Python
python -m http.server 8080 --directory app
# oder mit Node.js
npm start
```

Dann `http://localhost:8080` öffnen.

### Testmodus

Solange in `config.js` `allowTestMode: true` steht:

| Adresse | Wirkung |
|---|---|
| `index.html?test=1` | Alle 24 Türchen offen |
| `index.html?test=1&datum=2026-10-10` | Verhält sich wie am 10. Oktober 2026 |

Im Testmodus wird ein **separater** Spielstand verwendet, der sich über das Banner zurücksetzen lässt. **Vor dem Produktivgang `allowTestMode: false` setzen**, sonst kann jeder mit `?test=1` alle Türchen öffnen.

## Konfiguration

Alles Anpassbare steht in zwei Dateien:

**`app/js/config.js`**

| Einstellung | Bedeutung |
|---|---|
| `bankName`, `title`, `subtitle`, `footerNote` | Texte (`subtitle` leer = automatisch aus Monat) |
| `logo` | Pfad zur Logo-Datei (SVG/PNG) oder `""` für ein Textlogo aus `bankName` |
| `theme` | `"bayernlb"` (sachlich, kantig, links ausgerichtet) oder `"standard"` (weicher, festlicher) |
| `colors.primary`, `colors.accent` | Unternehmensfarben. Die eingetragenen BayernLB-Werte sind angelehnt und geschätzt; bitte durch die offiziellen Werte aus dem Corporate Design ersetzen |
| `colors.correct`, `colors.present`, `colors.absent` | Farben der Rückmeldung (auf ausreichenden Kontrast achten) |
| `year`, `month` | Jahr und Monat der Aktion (`12` = Dezember, `10` = Oktober-Probelauf). Jeder Monat hat einen eigenen Spielstand |
| `maxAttempts` | Versuche je Rätsel (Standard 6) |
| `wordLength` | Erwartete Wortlänge; `null`, wenn Rätsel unterschiedlich lang sein sollen |
| `showTopic` | Themenhinweis aus `puzzles.js` im Spiel anzeigen (Standard: `false`, damit er die Lösung nicht verrät) |
| `finale.title`, `finale.text`, `finale.signature` | Glückwunschtext nach allen 24 Türchen |
| `allowedWords` | Optional: Liste erlaubter Rateversuche; `null` = jede Buchstabenfolge |
| `allowTestMode` | Testmodus per URL erlauben |

**`app/js/puzzles.js`**: ein Eintrag je Tag mit `word` (Großbuchstaben, Ä/Ö/Ü/ß erlaubt), `topic` (Kategorie für die Pflege, im Spiel nur mit `showTopic: true` sichtbar) und `fact` (nach dem Spiel sichtbar). Das Raster passt sich an die Länge des Lösungsworts an. Fehler in der Liste (fehlender Tag, doppeltes Wort, falsche Länge) zeigt die App beim Laden als roten Hinweis an, und `npm test` prüft sie ebenfalls.

Die Rätsel eines Jahres sollten **vor dem 1. Dezember** feststehen. Wer ein Wort nachträglich ändert, macht bereits gespeicherte Versuche dieses Tages unbrauchbar (sie werden dann neu ausgewertet).

## Tests

```bash
npm test             # 19 Unit-Tests: Auswertung, doppelte Buchstaben, Umlaute/ß, Datum Europe/Berlin, Freischaltung, Speicherung, Rätselliste
npm install          # einmalig, nur für Browser-Tests
npx playwright install chromium
npm run test:e2e     # 9 Browser-Tests: Sperren inkl. Direktlink, Spielen per Tastatur und Bildschirmtastatur, Abschluss,
                     # verborgenes Thema,
                     # Gewinnen/Verlieren, Wiederherstellung nach Neuladen, Zeitzone, ohne Speicher, Smartphone,
                     # keine externen Netzwerkzugriffe, keine JavaScript-Fehler
```

Manuell zusätzlich empfohlen vor dem Start: einmal in Edge, Chrome, Firefox und Safari (iOS) öffnen, ein Rätsel lösen, neu laden.

## Interne Bereitstellung

### Empfehlung

**Den Ordner `app/` auf einem vorhandenen internen Webserver ablegen** (IIS, Apache, nginx oder eine interne Plattform für statische Inhalte) und unter einer internen Adresse wie `https://adventskalender.intranet.example` veröffentlichen. Das ist der einfachste Weg, der zu typischen Bankvorgaben passt: keine neue Infrastruktur, kein Anwendungsbetrieb, keine Daten, kein externer Dienst.

### Schritte bis zum Link im Intranet

1. **Inhalte finalisieren:** Logo und offizielle Farben in `config.js`; Rätsel prüfen; `allowTestMode: false`; `year` und `month` prüfen.
2. **Tests laufen lassen** (`npm test`, optional `npm run test:e2e`).
3. **IT-Ticket stellen** (siehe Abschnitt „Was die IT benötigt“) mit dem Inhalt von `app/` als ZIP.
4. **IT stellt bereit:** Dateien in ein Webverzeichnis kopieren, internen DNS-Namen bzw. Pfad einrichten, TLS-Zertifikat aus der internen PKI, Zugriff nur aus dem internen Netz.
5. **Abnahme:** Link auf einem Arbeitsplatz-PC und einem Diensthandy öffnen; im Testmodus-freien Zustand prüfen, dass vor dem 1.12. alles gesperrt ist.
6. **Kommunikation:** Link im Intranet, Newsletter oder Teams-Kanal veröffentlichen.
7. **Nach der Aktion:** Seite stehen lassen oder entfernen; es gibt keine Daten zu löschen.

### Mögliche Bereitstellungswege im Vergleich

| Weg | Eignung | Hinweise |
|---|---|---|
| Interner Webserver / statisches Hosting | **Empfohlen** | Ordner kopieren, fertig. |
| Interne Plattform für HTML/JS-Apps | Gut | Falls vorhanden und freigegeben; oft mit SSO davor. |
| SharePoint Online | Eingeschränkt | SharePoint Online liefert `.html`-Dateien aus Dokumentbibliotheken in der Regel als Download aus, statt sie auszuführen. Funktioniert meist nur über ein freigegebenes Web-Part (z. B. SPFx-Lösung) oder ein Einbetten per iFrame von einem internen Webserver. |
| SharePoint On-Premises / Intranet-CMS | Prüfen | Hängt davon ab, ob eigenes JavaScript erlaubt ist. Die Einzeldatei (`npm run build:single`) kann helfen. |
| Netzlaufwerk (`file://`) | Notlösung | Funktioniert technisch, aber Spielstände hängen am Dateipfad und Browser-Richtlinien können `file://` einschränken. |
| Öffentliche Hoster (GitHub Pages, Netlify …) | **Nicht ohne Freigabe** | Würde die Inhalte öffentlich machen und Zugriffe bei Dritten protokollieren. |

### Was die IT benötigt

- Ein Webverzeichnis für statische Dateien (ca. 100 KB), internen Hostnamen oder Pfad und ein internes TLS-Zertifikat.
- Kein Server-Code, keine Datenbank, keine Dienstkonten, keine Firewall-Freigaben nach außen.
- Empfohlene HTTP-Header (zusätzliche Absicherung, die App ist darauf vorbereitet):
  ```
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Cache-Control: no-cache
  ```
  `Cache-Control: no-cache` sorgt dafür, dass korrigierte Rätsel sofort ankommen (der Browser fragt kurz nach, ob sich etwas geändert hat). Für die Einzeldatei aus `build:single` muss die CSP `'unsafe-inline'` für Skripte und Styles erlauben; deshalb ist der Ordner `app/` die bevorzugte Variante.
- **Authentifizierung:** Die App selbst hat keine Anmeldung. Ist der Webserver nur intern erreichbar oder liegt er hinter dem Intranet-SSO, ist das ausreichend; zusätzliche Anmeldung ist nicht nötig, da keine Daten verarbeitet werden.
- **Hinweis für VDI/Citrix-Umgebungen:** Werden Browserprofile beim Abmelden gelöscht, geht der Spielstand verloren. Die IT kann sagen, ob `localStorage` auf den Arbeitsplätzen erhalten bleibt.

### Aktualisieren

Geänderte Dateien (meist nur `js/puzzles.js` oder `js/config.js`) auf dem Webserver ersetzen. Kein Build, kein Neustart.

## Datenschutz und Spielstände

- Es werden **keine personenbezogenen Daten** erhoben oder übertragen. Kein Tracking, keine Cookies, keine externen Schriften oder Skripte.
- Gespeichert wird nur, welche Wörter auf welchem Türchen geraten wurden, und zwar im `localStorage` des eigenen Browsers.
- **Einschränkungen**, die in der Kommunikation erwähnt werden sollten:
  - Der Fortschritt ist nicht auf anderen Geräten oder in anderen Browsern verfügbar.
  - Löschen der Browserdaten, private Fenster oder ein Profilwechsel entfernen den Fortschritt.
  - Eine Rangliste oder geräteübergreifende Synchronisierung ist mit dieser Lösung nicht möglich und bräuchte ein Backend (Erweiterungsoption in [docs/KONZEPT.md](docs/KONZEPT.md)).

## Bekannte Einschränkungen

- **Lösungen sind auslesbar:** Bei einer statischen App liegen alle Lösungswörter im ausgelieferten JavaScript. Die Oberfläche zeigt zukünftige Lösungen nie an, aber wer die Entwicklertools öffnet, kann sie finden. Für ein Spiel ohne Preise vertretbar; mit Gewinnspiel wäre eine serverseitige Prüfung nötig.
- **Datum kommt vom Gerät:** Wer die Systemuhr verstellt, kann Türchen früher öffnen.
- **Keine Wörterbuchprüfung:** Jede Buchstabenfolge in passender Länge wird akzeptiert. Eine eigene Liste lässt sich über `allowedWords` hinterlegen.
- **Sehr alte Browser** (Internet Explorer) werden nicht unterstützt.
