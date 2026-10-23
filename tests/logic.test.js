// Unit-Tests der Spiellogik. Start: node --test tests/
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const L = require("../app/js/logic.js");

const C = "correct", P = "present", A = "absent";

function loadBrowserGlobals(file) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "app", "js", file), "utf8"), ctx);
  return ctx.window;
}

function memoryStorage() {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    data
  };
}

test("Auswertung: alle richtig, alle falsch", () => {
  assert.deepEqual(L.evaluateGuess("KONTO", "KONTO"), [C, C, C, C, C]);
  assert.deepEqual(L.evaluateGuess("BRAUS", "KONTO"), [A, A, A, A, A]);
});

test("Auswertung: Buchstabe an falscher Stelle", () => {
  assert.deepEqual(L.evaluateGuess("OKTAN", "KONTO"), [P, P, P, A, P]);
});

test("Auswertung: doppelter Buchstabe im Versuch, einfacher in der Lösung", () => {
  // Lösung hat nur ein E: nur eines darf markiert werden, das exakte hat Vorrang.
  assert.deepEqual(L.evaluateGuess("EEEEE", "AKTIE"), [A, A, A, A, C]);
  assert.deepEqual(L.evaluateGuess("ESSEN", "AKTIE"), [P, A, A, A, A]);
});

test("Auswertung: doppelter Buchstabe in der Lösung", () => {
  // KERZE hat zwei E
  assert.deepEqual(L.evaluateGuess("EEXXX", "KERZE"), [P, C, A, A, A]);
  assert.deepEqual(L.evaluateGuess("XXEEE", "KERZE"), [A, A, P, A, C]);
  // KONTO hat zwei O, Versuch hat drei
  assert.deepEqual(L.evaluateGuess("OOOXX", "KONTO"), [P, C, A, A, A]);
});

test("Auswertung: Umlaute und ß sind eigene Buchstaben", () => {
  assert.deepEqual(L.evaluateGuess("BORSE", "BÖRSE"), [C, A, C, C, C]);
  assert.deepEqual(L.evaluateGuess("GRÜßE", "GRÜßE"), [C, C, C, C, C]);
  assert.deepEqual(L.evaluateGuess("GRÜSE", "GRÜßE"), [C, C, C, A, C]);
});

test("Normalisierung: Kleinbuchstaben, Umlaute, ß bleibt ß", () => {
  assert.equal(L.normalizeLetter("ä"), "Ä");
  assert.equal(L.normalizeLetter("ß"), "ß");
  assert.equal(L.normalizeLetter("ẞ"), "ß");
  assert.equal(L.normalizeLetter("1"), null);
  assert.equal(L.normalizeLetter("Enter"), null);
  assert.equal(L.normalizeWord("grüße"), "GRÜßE");
  // Zerlegte Umlaute (u + Trema) werden zusammengeführt
  assert.equal(L.normalizeWord("münze"), "MÜNZE");
  assert.equal(L.normalizeWord("é"), null);
});

test("Tastaturstatus nimmt den besten bekannten Zustand", () => {
  const ks = L.keyboardStates(["OKTAN", "KONTO"], "KONTO");
  assert.equal(ks.K, C);
  assert.equal(ks.A, A);
  assert.equal(ks.O, C);
});

test("Eingabeprüfung liefert verständliche Meldungen", () => {
  assert.match(L.validateGuess("", 5), /zuerst ein Wort/);
  assert.match(L.validateGuess("KON", 5), /fehlen noch 2 Buchstaben/);
  assert.match(L.validateGuess("KONT", 5), /fehlt noch 1 Buchstabe/);
  assert.equal(L.validateGuess("KONTO", 5), null);
  assert.equal(L.validateGuess("GRÜßE", 5), null);
  assert.match(L.validateGuess("XXXXX", 5, ["KONTO"]), /kennt der Kalender/);
});

test("Datum in Europe/Berlin, unabhängig von UTC", () => {
  // 30.11. 23:30 UTC ist in Berlin bereits der 1.12. 00:30 (Winterzeit, UTC+1)
  assert.deepEqual(L.dateInZone(new Date("2026-11-30T23:30:00Z"), "Europe/Berlin"), { year: 2026, month: 12, day: 1 });
  // 30.11. 22:59 UTC ist in Berlin noch der 30.11. 23:59
  assert.deepEqual(L.dateInZone(new Date("2026-11-30T22:59:00Z"), "Europe/Berlin"), { year: 2026, month: 11, day: 30 });
  // Silvester-Grenze
  assert.deepEqual(L.dateInZone(new Date("2026-12-31T23:30:00Z"), "Europe/Berlin"), { year: 2027, month: 1, day: 1 });
});

test("Freischaltung je Datum (Dezember als Standard)", () => {
  const y = 2026;
  assert.equal(L.unlockedUpTo({ year: 2026, month: 11, day: 30 }, y), 0);
  assert.equal(L.unlockedUpTo({ year: 2026, month: 12, day: 1 }, y), 1);
  assert.equal(L.unlockedUpTo({ year: 2026, month: 12, day: 13 }, y), 13);
  assert.equal(L.unlockedUpTo({ year: 2026, month: 12, day: 28 }, y), 24);
  assert.equal(L.unlockedUpTo({ year: 2027, month: 1, day: 5 }, y), 24);
  assert.equal(L.unlockedUpTo({ year: 2025, month: 12, day: 20 }, y), 0);
  assert.equal(L.isUnlocked(5, { year: 2026, month: 12, day: 4 }, y, false), false);
  assert.equal(L.isUnlocked(4, { year: 2026, month: 12, day: 4 }, y, false), true);
  assert.equal(L.isUnlocked(24, { year: 2026, month: 10, day: 23 }, y, true), true);
  assert.equal(L.isUnlocked(25, { year: 2026, month: 12, day: 30 }, y, true), false);
});

test("Freischaltung in einem anderen Aktionsmonat (Oktober)", () => {
  const y = 2026, m = 10;
  assert.equal(L.unlockedUpTo({ year: 2026, month: 9, day: 30 }, y, m), 0);
  assert.equal(L.unlockedUpTo({ year: 2026, month: 10, day: 1 }, y, m), 1);
  assert.equal(L.unlockedUpTo({ year: 2026, month: 10, day: 23 }, y, m), 23);
  assert.equal(L.unlockedUpTo({ year: 2026, month: 10, day: 31 }, y, m), 24);
  assert.equal(L.unlockedUpTo({ year: 2026, month: 12, day: 1 }, y, m), 24);
  assert.equal(L.unlockedUpTo({ year: 2025, month: 10, day: 20 }, y, m), 0);
  assert.equal(L.isUnlocked(23, { year: 2026, month: 10, day: 23 }, y, false, m), true);
  assert.equal(L.isUnlocked(24, { year: 2026, month: 10, day: 23 }, y, false, m), false);
});

test("Testdatum wird streng geparst", () => {
  assert.deepEqual(L.parseIsoDate("2026-12-10"), { year: 2026, month: 12, day: 10 });
  assert.equal(L.parseIsoDate("10.12.2026"), null);
  assert.equal(L.parseIsoDate("2026-13-01"), null);
  assert.equal(L.parseIsoDate(null), null);
});

test("Spielstand speichern und wiederherstellen", () => {
  const s = memoryStorage();
  const p = L.emptyProgress();
  p.days[3] = { guesses: ["DATUM", "DATEN"] };
  assert.equal(L.saveProgress(s, 2026, p), true);
  const loaded = L.loadProgress(s, 2026);
  assert.deepEqual(loaded.days[3].guesses, ["DATUM", "DATEN"]);
  assert.equal(L.dayStatus(loaded.days[3].guesses, "DATEN", 6), "won");
  // anderes Jahr ist getrennt
  assert.deepEqual(L.loadProgress(s, 2027).days, {});
});

test("Spielstand: kaputte Daten und fehlender Speicher brechen nichts", () => {
  const s = memoryStorage();
  s.setItem(L.storageKey(2026), "{kaputt");
  assert.deepEqual(L.loadProgress(s, 2026), L.emptyProgress());
  s.setItem(L.storageKey(2026), "null");
  assert.deepEqual(L.loadProgress(s, 2026), L.emptyProgress());
  assert.deepEqual(L.loadProgress(null, 2026), L.emptyProgress());
  assert.equal(L.saveProgress(null, 2026, L.emptyProgress()), false);
  const full = { getItem: () => null, setItem: () => { throw new Error("QuotaExceeded"); } };
  assert.equal(L.saveProgress(full, 2026, L.emptyProgress()), false);
});

test("Spielstand wird bereinigt und Status neu berechnet", () => {
  const g = L.sanitizeGuesses(["konto", "zu lang!", "XX", "KONTO", "KASSE"], "KONTO", 6);
  assert.deepEqual(g, ["KONTO"]); // nach dem Treffer wird nichts mehr übernommen
  const lost = L.sanitizeGuesses(["AAAAA", "BBBBB", "CCCCC", "DDDDD", "EEEEE", "FFFFF", "GGGGG"], "KONTO", 6);
  assert.equal(lost.length, 6);
  assert.equal(L.dayStatus(lost, "KONTO", 6), "lost");
  assert.equal(L.dayStatus([], "KONTO", 6), "new");
  assert.equal(L.dayStatus(["AAAAA"], "KONTO", 6), "playing");
  assert.deepEqual(L.sanitizeGuesses("kein Array", "KONTO", 6), []);
});

test("Statistik zählt gelöst, aufgelöst und Verteilung", () => {
  const puzzles = [{ day: 1, word: "KONTO" }, { day: 2, word: "KERZE" }, { day: 3, word: "DATEN" }];
  const p = { days: {
    1: { guesses: ["KASSE", "KONTO"] },
    2: { guesses: ["AAAAA", "BBBBB", "CCCCC", "DDDDD", "EEEEE", "FFFFF"] },
    3: { guesses: ["DATUM"] }
  } };
  const s = L.summary(p, puzzles, 6);
  assert.equal(s.solved, 1);
  assert.equal(s.lost, 1);
  assert.equal(s.playing, 1);
  assert.deepEqual(s.distribution, [0, 1, 0, 0, 0, 0]);
});

test("Die ausgelieferten 24 Rätsel sind gültig", () => {
  const w = loadBrowserGlobals("puzzles.js");
  const cfg = loadBrowserGlobals("config.js").ADVENT_CONFIG;
  assert.equal(w.ADVENT_PUZZLES.length, 24);
  assert.deepEqual(L.validatePuzzles(w.ADVENT_PUZZLES, cfg.wordLength), []);
  w.ADVENT_PUZZLES.forEach((p) => {
    assert.ok(p.topic, "Thema fehlt an Tag " + p.day);
    assert.ok(p.fact, "Fun Fact fehlt an Tag " + p.day);
  });
});

test("Rätselprüfung findet Pflegefehler", () => {
  const broken = [{ day: 1, word: "konto" }, { day: 1, word: "ABC" }, { day: 30, word: "KASSE" }];
  const problems = L.validatePuzzles(broken, 5);
  assert.ok(problems.some((p) => /Großbuchstaben/.test(p)));
  assert.ok(problems.some((p) => /doppelt/.test(p)));
  assert.ok(problems.some((p) => /zwischen 1 und 24/.test(p)));
  assert.ok(problems.some((p) => /Tag 24 fehlt/.test(p)));
});

test("Konfiguration: Testmodus ist bewusst einschaltbar und Werte sind plausibel", () => {
  const cfg = loadBrowserGlobals("config.js").ADVENT_CONFIG;
  assert.equal(typeof cfg.allowTestMode, "boolean");
  assert.ok(cfg.maxAttempts >= 1 && cfg.maxAttempts <= 10);
  assert.equal(cfg.timeZone, "Europe/Berlin");
  assert.ok(cfg.month >= 1 && cfg.month <= 12);
  assert.ok(cfg.finale && cfg.finale.title && cfg.finale.text, "Abschlusstext fehlt");
});
