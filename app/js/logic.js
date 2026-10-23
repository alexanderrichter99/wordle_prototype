/*
 * Reine Spiellogik ohne Zugriff auf das DOM.
 * Läuft im Browser (window.AdventLogic) und in Node (require) für die Tests.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.AdventLogic = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var STATE = { CORRECT: "correct", PRESENT: "present", ABSENT: "absent" };
  var LETTER_RE = /^[A-ZÄÖÜß]$/;

  // Großschreibung ohne ß -> SS (toUpperCase würde aus "ß" "SS" machen).
  function normalizeLetter(ch) {
    if (typeof ch !== "string") return null;
    ch = ch.normalize("NFC");
    if (ch === "ß" || ch === "ẞ") return "ß";
    if (ch.length !== 1) return null;
    var up = ch.toUpperCase();
    return LETTER_RE.test(up) ? up : null;
  }

  function normalizeWord(word) {
    var out = [];
    var chars = Array.from(String(word).normalize("NFC"));
    for (var i = 0; i < chars.length; i++) {
      var l = normalizeLetter(chars[i]);
      if (!l) return null;
      out.push(l);
    }
    return out.join("");
  }

  /*
   * Wordle-Auswertung in zwei Durchläufen, damit doppelte Buchstaben stimmen:
   * 1. exakte Treffer markieren und aus dem Vorrat nehmen,
   * 2. übrige Buchstaben nur so oft gelb färben, wie sie im Vorrat übrig sind.
   */
  function evaluateGuess(guess, solution) {
    var g = Array.from(guess);
    var s = Array.from(solution);
    if (g.length !== s.length) throw new Error("Wortlänge stimmt nicht überein");
    var result = new Array(g.length);
    var remaining = {};
    for (var i = 0; i < s.length; i++) {
      if (g[i] === s[i]) {
        result[i] = STATE.CORRECT;
      } else {
        remaining[s[i]] = (remaining[s[i]] || 0) + 1;
      }
    }
    for (var j = 0; j < g.length; j++) {
      if (result[j]) continue;
      if (remaining[g[j]] > 0) {
        result[j] = STATE.PRESENT;
        remaining[g[j]]--;
      } else {
        result[j] = STATE.ABSENT;
      }
    }
    return result;
  }

  // Bester bekannter Zustand je Buchstabe, für die Bildschirmtastatur.
  function keyboardStates(guesses, solution) {
    var rank = { absent: 1, present: 2, correct: 3 };
    var states = {};
    guesses.forEach(function (guess) {
      var ev = evaluateGuess(guess, solution);
      Array.from(guess).forEach(function (letter, i) {
        if (!states[letter] || rank[ev[i]] > rank[states[letter]]) states[letter] = ev[i];
      });
    });
    return states;
  }

  /*
   * Menge gültiger Rateversuche aus Wörterbuch (Text mit Leerzeichen getrennt),
   * Lösungswörtern und Zusatzwörtern. Lösungswörter sind immer gültig.
   */
  function buildWordSet(dictionaryText, solutions, extraWords) {
    var set = new Set();
    String(dictionaryText || "").split(/\s+/).forEach(function (w) {
      var n = normalizeWord(w);
      if (n) set.add(n);
    });
    (solutions || []).concat(extraWords || []).forEach(function (w) {
      var n = normalizeWord(w || "");
      if (n) set.add(n);
    });
    return set;
  }

  // Prüft einen Versuch. allowedWords ist ein Set oder null (= jede Buchstabenfolge).
  // Liefert null bei Erfolg, sonst eine verständliche Fehlermeldung.
  function validateGuess(guess, length, allowedWords) {
    var n = Array.from(guess).length;
    if (n === 0) return "Bitte gib zuerst ein Wort ein.";
    if (n < length) {
      var missing = length - n;
      return "Zu kurz: Das Wort hat " + length + " Buchstaben. Es " +
        (missing === 1 ? "fehlt noch 1 Buchstabe." : "fehlen noch " + missing + " Buchstaben.");
    }
    if (n > length) return "Zu lang: Das Wort hat nur " + length + " Buchstaben.";
    if (normalizeWord(guess) !== guess) return "Bitte nur Buchstaben verwenden.";
    if (allowedWords && !allowedWords.has(guess)) return "„" + guess + "“ steht nicht im Wörterbuch. Bitte ein echtes Wort eingeben.";
    return null;
  }

  /*
   * Kalenderdatum (Jahr, Monat, Tag) in der angegebenen Zeitzone,
   * unabhängig von der Zeitzone des Rechners.
   */
  function dateInZone(date, timeZone) {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "Europe/Berlin",
      year: "numeric", month: "numeric", day: "numeric"
    }).formatToParts(date);
    var out = {};
    parts.forEach(function (p) {
      if (p.type === "year" || p.type === "month" || p.type === "day") out[p.type] = parseInt(p.value, 10);
    });
    return out;
  }

  // Parst "JJJJ-MM-TT" (z. B. aus dem Testmodus). Ungültiges liefert null.
  function parseIsoDate(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || "");
    if (!m) return null;
    var d = { year: +m[1], month: +m[2], day: +m[3] };
    if (d.month < 1 || d.month > 12 || d.day < 1 || d.day > 31) return null;
    return d;
  }

  /*
   * Höchstes freigeschaltetes Türchen (0 bis 24) für ein Kalenderdatum.
   * month ist der Aktionsmonat (1–12, Standard 12 = Dezember).
   * Vor dem Aktionsmonat: 0. Ab dem 24. und danach: 24.
   */
  function unlockedUpTo(today, year, month) {
    month = month || 12;
    if (today.year !== year) return today.year < year ? 0 : 24;
    if (today.month !== month) return today.month < month ? 0 : 24;
    return Math.min(today.day, 24);
  }

  function isUnlocked(day, today, year, testMode, month) {
    if (testMode) return day >= 1 && day <= 24;
    return day >= 1 && day <= unlockedUpTo(today, year, month);
  }

  // ---------- Spielstand ----------

  function emptyProgress() {
    return { version: 1, days: {} };
  }

  function storageKey(year) {
    return "adventskalender-" + year;
  }

  // Lädt den Spielstand. Defekte oder fehlende Daten ergeben einen leeren Stand.
  function loadProgress(storage, year) {
    if (!storage) return emptyProgress();
    try {
      var raw = storage.getItem(storageKey(year));
      if (!raw) return emptyProgress();
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object" || typeof data.days !== "object" || data.days === null) return emptyProgress();
      return { version: 1, days: data.days };
    } catch (e) {
      return emptyProgress();
    }
  }

  // Speichert den Spielstand. Liefert false, wenn der Browser nicht speichern kann.
  function saveProgress(storage, year, progress) {
    if (!storage) return false;
    try {
      storage.setItem(storageKey(year), JSON.stringify(progress));
      return true;
    } catch (e) {
      return false;
    }
  }

  /*
   * Status eines Tages aus seinen Versuchen. Ergebnisse werden immer neu
   * berechnet, damit ein manipulierter oder veralteter Stand nichts Falsches anzeigt.
   */
  function dayStatus(guesses, solution, maxAttempts) {
    guesses = guesses || [];
    if (guesses.indexOf(solution) !== -1) return "won";
    if (guesses.length >= maxAttempts) return "lost";
    if (guesses.length > 0) return "playing";
    return "new";
  }

  // Bereinigte Versuche eines Tages: nur gültige Wörter passender Länge, bis zum Spielende.
  function sanitizeGuesses(guesses, solution, maxAttempts) {
    var len = Array.from(solution).length;
    var out = [];
    if (!Array.isArray(guesses)) return out;
    for (var i = 0; i < guesses.length && out.length < maxAttempts; i++) {
      var g = normalizeWord(guesses[i]);
      if (!g || Array.from(g).length !== len) continue;
      out.push(g);
      if (g === solution) break;
    }
    return out;
  }

  function summary(progress, puzzles, maxAttempts) {
    var s = { solved: 0, lost: 0, playing: 0, distribution: [] };
    for (var k = 0; k < maxAttempts; k++) s.distribution.push(0);
    puzzles.forEach(function (p) {
      var entry = progress.days[p.day];
      var guesses = sanitizeGuesses(entry && entry.guesses, p.word, maxAttempts);
      var st = dayStatus(guesses, p.word, maxAttempts);
      if (st === "won") { s.solved++; s.distribution[guesses.length - 1]++; }
      else if (st === "lost") s.lost++;
      else if (st === "playing") s.playing++;
    });
    return s;
  }

  // Prüft die Rätselliste auf typische Pflegefehler. Liefert eine Liste von Problemen.
  function validatePuzzles(puzzles, expectedLength) {
    var problems = [];
    var seenDays = {};
    var seenWords = {};
    if (!Array.isArray(puzzles)) return ["Rätselliste fehlt"];
    puzzles.forEach(function (p, i) {
      var where = "Rätsel " + (p && p.day ? "Tag " + p.day : "#" + (i + 1));
      if (!p || !(p.day >= 1 && p.day <= 24)) { problems.push(where + ": Tag muss zwischen 1 und 24 liegen"); return; }
      if (seenDays[p.day]) problems.push(where + ": Tag doppelt vergeben");
      seenDays[p.day] = true;
      var w = normalizeWord(p.word || "");
      if (!w || w !== p.word) problems.push(where + ": Lösungswort muss aus Großbuchstaben (inkl. ÄÖÜß) bestehen");
      else if (expectedLength && Array.from(w).length !== expectedLength) problems.push(where + ": Lösungswort hat nicht " + expectedLength + " Buchstaben");
      if (w && seenWords[w]) problems.push(where + ": Lösungswort doppelt");
      if (w) seenWords[w] = true;
    });
    for (var d = 1; d <= 24; d++) if (!seenDays[d]) problems.push("Tag " + d + " fehlt");
    return problems;
  }

  return {
    STATE: STATE,
    normalizeLetter: normalizeLetter,
    normalizeWord: normalizeWord,
    evaluateGuess: evaluateGuess,
    keyboardStates: keyboardStates,
    validateGuess: validateGuess,
    buildWordSet: buildWordSet,
    dateInZone: dateInZone,
    parseIsoDate: parseIsoDate,
    unlockedUpTo: unlockedUpTo,
    isUnlocked: isUnlocked,
    emptyProgress: emptyProgress,
    storageKey: storageKey,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    dayStatus: dayStatus,
    sanitizeGuesses: sanitizeGuesses,
    summary: summary,
    validatePuzzles: validatePuzzles
  };
});
