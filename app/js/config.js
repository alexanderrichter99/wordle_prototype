/*
 * Zentrale Konfiguration des Adventskalenders.
 * Diese Datei ist die einzige Stelle, die für Branding und Spielregeln angepasst werden muss.
 */
window.ADVENT_CONFIG = {
  // Branding
  bankName: "BayernLB",
  title: "Der digitale Adventskalender",
  // Leer lassen, um den Untertitel aus Monat und Jahr zu erzeugen ("Vom 1. bis 24. Oktober …").
  subtitle: "",
  // Pfad zu einer Logo-Datei (SVG/PNG) relativ zu index.html, oder "" für ein Textlogo aus bankName.
  // Das offizielle Logo bitte aus dem Corporate-Design-Portal übernehmen, nicht nachbauen.
  logo: "",

  // Erscheinungsbild: "bayernlb" (sachlich, kantig, links ausgerichtet) oder "standard" (weicher, festlicher)
  theme: "bayernlb",

  // Unternehmensfarben. Alle anderen Farben leiten sich davon ab.
  // Die Werte für "bayernlb" sind an den Webauftritt angelehnt und geschätzt;
  // vor dem Einsatz durch die offiziellen Werte aus dem Corporate Design ersetzen.
  colors: {
    primary: "#00305e", // Hauptfarbe (Kopfzeile, Buttons, Überschriften)
    accent: "#0a7cc1", // Akzent (Hervorhebungen, Fortschritt)
    festive: "#c9a54e", // Weihnachtlicher Akzent (Sterne, Baum, heutiges Türchen)
    correct: "#1f7a4d", // Buchstabe an richtiger Stelle
    present: "#d4a72c", // Buchstabe kommt vor, falsche Stelle
    absent: "#6b7480" // Buchstabe kommt nicht vor
  },

  // Zeitraum: Türchen 1 bis 24 öffnen sich am 1. bis 24. Tag dieses Monats.
  // 12 = Dezember (regulär), 10 = Oktober (Probelauf).
  year: 2026,
  month: 10,
  timeZone: "Europe/Berlin",

  // Spielregeln
  maxAttempts: 6, // Anzahl Versuche je Rätsel
  wordLength: 5, // Erwartete Wortlänge; wird beim Laden gegen puzzles.js geprüft
  showTopic: false, // Themenhinweis (topic aus puzzles.js) im Spiel anzeigen

  // Nur echte Wörter als Rateversuch zulassen (Wörterbuch in js/words.js).
  // false = jede Buchstabenfolge passender Länge ist erlaubt.
  dictionary: true,
  // Zusätzlich erlaubte Wörter, die im Wörterbuch fehlen (Großbuchstaben), z. B. ["GIROS"].
  // Die 24 Lösungswörter sind immer erlaubt.
  extraWords: [],

  // Testmodus: ?test=1 öffnet alle Türchen, ?test=1&datum=2026-10-10 simuliert ein Datum.
  // Für den Produktivbetrieb auf false setzen.
  allowTestMode: true,

  // Abschluss, sobald alle 24 Türchen gespielt sind
  finale: {
    title: "Herzlichen Glückwunsch!",
    text: "Du hast alle 24 Türchen geöffnet. Danke fürs Mitraten! Wir wünschen dir und deinen Liebsten frohe Weihnachten, erholsame Feiertage und einen guten Start ins neue Jahr.",
    signature: "Deine BayernLB"
  },

  // Hinweis im Fuß der Seite
  footerNote: "Eine Aktion für alle Kolleginnen und Kollegen. Dein Spielstand bleibt in deinem Browser."
};
