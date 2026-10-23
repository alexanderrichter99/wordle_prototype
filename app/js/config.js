/*
 * Zentrale Konfiguration des Adventskalenders.
 * Diese Datei ist die einzige Stelle, die für Branding und Spielregeln angepasst werden muss.
 */
window.ADVENT_CONFIG = {
  // Branding (neutrale Platzhalter)
  bankName: "Musterbank",
  title: "Der digitale Adventskalender",
  subtitle: "Jeden Tag ein neues Worträtsel vom 1. bis 24. Dezember",
  // Pfad zu einer Logo-Datei (SVG/PNG) relativ zu index.html, oder "" für das Textlogo.
  logo: "assets/logo.svg",

  // Unternehmensfarben. Alle anderen Farben leiten sich davon ab.
  colors: {
    primary: "#0b3d6b", // Hauptfarbe (Kopfzeile, Buttons)
    accent: "#b8862b", // Weihnachtlicher Akzent (Sterne, Hervorhebungen)
    correct: "#2e7d4f", // Buchstabe an richtiger Stelle
    present: "#c9a227", // Buchstabe kommt vor, falsche Stelle
    absent: "#6b7280" // Buchstabe kommt nicht vor
  },

  // Spielregeln
  year: 2026, // Jahr der Aktion (Dezember dieses Jahres)
  maxAttempts: 6, // Anzahl Versuche je Rätsel
  wordLength: 5, // Erwartete Wortlänge; wird beim Laden gegen puzzles.js geprüft
  timeZone: "Europe/Berlin",

  // Optionale Liste erlaubter Rateversuche (Großbuchstaben). null = jede Buchstabenfolge erlaubt.
  // Beispiel: allowedWords: ["KONTO", "KASSE", ...]
  allowedWords: null,

  // Testmodus: Aufruf mit ?test=1 schaltet alle Türchen frei,
  // ?test=1&datum=2026-12-10 simuliert ein Datum.
  // Für den Produktivbetrieb auf false setzen.
  allowTestMode: true,

  // Hinweis im Fuß der Seite (z. B. Ansprechpartner der Aktion)
  footerNote: "Eine Aktion für alle Kolleginnen und Kollegen. Dein Spielstand bleibt in deinem Browser."
};
