/*
 * Oberfläche des Adventskalenders: Kalender, Spielansicht, Ergebnis.
 * Die Spielregeln selbst stehen in logic.js.
 */
(function () {
  "use strict";

  var L = window.AdventLogic;
  var CONFIG = window.ADVENT_CONFIG || {};
  var PUZZLES = (window.ADVENT_PUZZLES || []).slice().sort(function (a, b) { return a.day - b.day; });
  var MAX = CONFIG.maxAttempts || 6;
  var YEAR = CONFIG.year || new Date().getFullYear();
  var ALLOWED = Array.isArray(CONFIG.allowedWords)
    ? CONFIG.allowedWords.map(L.normalizeWord).filter(Boolean)
    : null;

  var KEY_ROWS = [
    ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P", "Ü"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ö", "Ä"],
    ["ENTER", "Y", "X", "C", "V", "B", "N", "M", "ß", "BACK"]
  ];
  var STATE_TEXT = { correct: "richtige Stelle", present: "kommt vor, andere Stelle", absent: "nicht enthalten" };
  var WIN_TITLES = ["Volltreffer!", "Hervorragend!", "Stark gelöst!", "Sehr gut!", "Geschafft!", "Knapp, aber gelöst!"];

  // ---------- Umgebung: Testmodus, Datum, Speicher ----------

  var params = new URLSearchParams(window.location.search);
  var testMode = CONFIG.allowTestMode === true && params.get("test") === "1";
  var simulatedDate = testMode ? L.parseIsoDate(params.get("datum")) : null;
  // Mit simuliertem Datum gelten die normalen Sperren für dieses Datum, ohne Datum ist alles offen.
  var unlockAll = testMode && !simulatedDate;

  function today() {
    return simulatedDate || L.dateInZone(new Date(), CONFIG.timeZone);
  }

  var storage = null;
  try {
    var probe = "__adventskalender_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    storage = window.localStorage;
  } catch (e) {
    storage = null;
  }
  // Der Testmodus speichert getrennt, damit Tests den echten Spielstand nicht verändern.
  var storageYear = testMode ? YEAR + "-test" : YEAR;
  var progress = L.loadProgress(storage, storageYear);

  function persist() {
    L.saveProgress(storage, storageYear, progress);
  }

  function puzzleFor(day) {
    for (var i = 0; i < PUZZLES.length; i++) if (PUZZLES[i].day === day) return PUZZLES[i];
    return null;
  }

  function guessesFor(p) {
    var entry = progress.days[p.day];
    return L.sanitizeGuesses(entry && entry.guesses, p.word, MAX);
  }

  function statusFor(p) {
    return L.dayStatus(guessesFor(p), p.word, MAX);
  }

  function unlocked(day) {
    return unlockAll || L.isUnlocked(day, today(), YEAR, false);
  }

  function wordLength(p) {
    return Array.from(p.word).length;
  }

  // ---------- kleine DOM-Helfer ----------

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // ---------- Branding ----------

  function applyBranding() {
    var root = document.documentElement.style;
    var c = CONFIG.colors || {};
    if (c.primary) root.setProperty("--primary", c.primary);
    if (c.accent) root.setProperty("--accent", c.accent);
    if (c.correct) root.setProperty("--correct", c.correct);
    if (c.present) root.setProperty("--present", c.present);
    if (c.absent) root.setProperty("--absent", c.absent);

    var name = CONFIG.bankName || "";
    $("brand-name").textContent = name;
    if (CONFIG.logo) {
      var img = $("brand-logo");
      // Das Logo enthält in der Regel den Namen; fällt es aus, erscheinen Monogramm und Name.
      img.alt = name;
      img.src = CONFIG.logo;
      img.hidden = false;
      img.onerror = function () { img.hidden = true; $("brand-mark").hidden = false; $("brand-name").hidden = false; };
      $("brand-mark").hidden = true;
      $("brand-name").hidden = true;
    }
    $("brand-mark").textContent = name.charAt(0) || "★";
    $("home-title").textContent = CONFIG.title || "Der digitale Adventskalender";
    $("home-subtitle").textContent = CONFIG.subtitle || "";
    $("footer-note").textContent = CONFIG.footerNote || "";
    $("howto-attempts").textContent = MAX;
    document.title = (CONFIG.title || "Adventskalender") + (name ? " · " + name : "");
    if (!storage) $("storage-note").hidden = false;

    if (testMode) {
      $("test-banner").hidden = false;
      $("test-banner-text").textContent = simulatedDate
        ? "Simuliertes Datum: " + simulatedDate.day + "." + simulatedDate.month + "." + simulatedDate.year + "."
        : "Alle Türchen sind geöffnet. Der Spielstand wird getrennt vom echten gespeichert.";
      $("test-reset").addEventListener("click", function () {
        progress = L.emptyProgress();
        persist();
        route();
      });
    }

    var problems = L.validatePuzzles(PUZZLES, CONFIG.wordLength || null);
    if (problems.length) {
      $("config-error").hidden = false;
      $("config-error").textContent = "Konfigurationsfehler in puzzles.js: " + problems.join("; ");
      if (window.console) console.error("Adventskalender:", problems);
    }
  }

  // ---------- Startseite ----------

  function renderHome() {
    var t = today();
    var upTo = unlockAll ? 24 : L.unlockedUpTo(t, YEAR);
    var sum = L.summary(progress, PUZZLES, MAX);
    var done = sum.solved + sum.lost;

    // Fortschritt
    $("progress-count").textContent = done + " von 24 abgeschlossen";
    $("progress-bar").setAttribute("aria-valuenow", String(done));
    $("progress-bar").setAttribute("aria-valuetext", done + " von 24 Rätseln abgeschlossen");
    $("progress-fill").style.width = (done / 24 * 100) + "%";

    renderTodayCard(t, upTo);

    // Kalender
    var cal = $("calendar");
    cal.textContent = "";
    var currentDay = (t.year === YEAR && t.month === 12 && t.day <= 24) ? t.day : null;
    for (var day = 1; day <= 24; day++) {
      var p = puzzleFor(day);
      var li = el("li", "door-item");
      var open = p && unlocked(day);
      var status = open ? statusFor(p) : "locked";
      var door = el(open ? "a" : "div", "door");
      door.setAttribute("data-status", status);
      if (day === currentDay) door.classList.add("door-today");
      door.appendChild(el("span", "door-number", String(day)));
      var label = el("span", "door-label");
      var aria = "Türchen " + day + ": ";
      if (!open) {
        label.textContent = "🔒 " + day + ". Dez.";
        aria += "noch gesperrt, öffnet am " + day + ". Dezember";
        door.setAttribute("aria-disabled", "true");
        door.setAttribute("role", "img");
      } else {
        door.href = "#/tag/" + day;
        var txt = { "new": day === currentDay ? "Heute neu" : "Offen", playing: "Angefangen", won: "✓ Gelöst", lost: "Aufgelöst" }[status];
        label.textContent = txt;
        aria += txt.replace("✓ ", "");
      }
      door.setAttribute("aria-label", aria);
      door.appendChild(label);
      li.appendChild(door);
      cal.appendChild(li);
    }

    // Statistik
    var stats = $("stats");
    stats.textContent = "";
    [["Gelöst", sum.solved], ["Aufgelöst", sum.lost], ["Angefangen", sum.playing],
      ["Quote", done ? Math.round(sum.solved / done * 100) + " %" : "–"]].forEach(function (s) {
      var d = el("div", "stat");
      d.appendChild(el("dd", "stat-value", String(s[1])));
      d.appendChild(el("dt", "stat-label", s[0]));
      stats.appendChild(d);
    });
    var dist = $("distribution");
    dist.textContent = "";
    var maxCount = Math.max.apply(null, sum.distribution.concat([1]));
    sum.distribution.forEach(function (count, i) {
      var row = el("li", "dist-row");
      row.setAttribute("aria-label", count + " Rätsel im " + (i + 1) + ". Versuch gelöst");
      row.appendChild(el("span", "dist-label", String(i + 1)));
      var bar = el("span", "dist-bar");
      var fill = el("span", "dist-fill", String(count));
      fill.style.width = Math.max(count / maxCount * 100, 8) + "%";
      if (count === 0) fill.classList.add("dist-empty");
      bar.appendChild(fill);
      row.appendChild(bar);
      dist.appendChild(row);
    });
  }

  function renderTodayCard(t, upTo) {
    var card = $("today-card");
    card.textContent = "";
    var text = el("div", "today-text");
    var action = null;

    if (upTo === 0) {
      var first = new Date(Date.UTC(YEAR, 11, 1));
      var now = new Date(Date.UTC(t.year, t.month - 1, t.day));
      var daysLeft = Math.round((first - now) / 86400000);
      text.appendChild(el("p", "today-kicker", "Bald geht es los"));
      text.appendChild(el("p", "today-main", "Das erste Türchen öffnet sich am 1. Dezember " + YEAR + "."));
      text.appendChild(el("p", "today-sub", daysLeft === 1 ? "Nur noch 1 Tag." : "Noch " + daysLeft + " Tage."));
    } else {
      // Heute = höchstes freigeschaltetes Türchen; danach das erste offene, noch nicht beendete.
      var target = puzzleFor(upTo);
      var targetStatus = target ? statusFor(target) : "new";
      var afterAdvent = !unlockAll && (t.year > YEAR || t.day > 24);
      if (unlockAll || afterAdvent || targetStatus === "won" || targetStatus === "lost") {
        var pending = null;
        for (var d = 1; d <= upTo; d++) {
          var p = puzzleFor(d);
          if (p && (statusFor(p) === "new" || statusFor(p) === "playing")) { pending = p; break; }
        }
        if (unlockAll || afterAdvent) {
          text.appendChild(el("p", "today-kicker", unlockAll ? "Testmodus" : "Frohe Weihnachten!"));
          text.appendChild(el("p", "today-main", "Alle 24 Türchen sind geöffnet."));
        } else {
          text.appendChild(el("p", "today-kicker", "Türchen " + upTo));
          text.appendChild(el("p", "today-main", targetStatus === "won" ? "Das heutige Rätsel hast du gelöst. Morgen geht es weiter!" : "Das heutige Rätsel ist abgeschlossen. Morgen geht es weiter!"));
        }
        if (pending) {
          text.appendChild(el("p", "today-sub", "Noch offen: Türchen " + pending.day + "."));
          action = { href: "#/tag/" + pending.day, label: (statusFor(pending) === "playing" ? "Weiterspielen: Türchen " : "Nachholen: Türchen ") + pending.day };
        }
      } else {
        text.appendChild(el("p", "today-kicker", "Heute, " + t.day + ". Dezember"));
        text.appendChild(el("p", "today-main", "Türchen " + upTo + " ist geöffnet."));
        text.appendChild(el("p", "today-sub", "Thema: " + target.topic));
        action = { href: "#/tag/" + upTo, label: targetStatus === "playing" ? "Weiterspielen" : "Rätsel von heute spielen" };
      }
    }
    card.appendChild(el("span", "today-star", "★"));
    card.appendChild(text);
    if (action) {
      var a = el("a", "button button-large", action.label);
      a.href = action.href;
      card.appendChild(a);
    }
  }

  // ---------- Spielansicht ----------

  var game = null; // { puzzle, guesses, current, busy }

  function openGame(day) {
    var p = puzzleFor(day);
    game = { puzzle: p, guesses: guessesFor(p), current: "", busy: false };
    $("game-title").textContent = "Türchen " + day + " · " + day + ". Dezember";
    $("game-topic").textContent = "Thema: " + p.topic;
    buildBoard();
    buildKeyboard();
    renderGame(false);
    $("toast").textContent = "";
    $("toast").classList.remove("toast-visible");
    var st = statusFor(p);
    if (st === "won" || st === "lost") $("result").focus();
    else $("board").focus();
  }

  function buildBoard() {
    var board = $("board");
    var len = wordLength(game.puzzle);
    board.textContent = "";
    board.style.setProperty("--cols", len);
    board.setAttribute("aria-label", "Spielfeld: " + MAX + " Versuche mit je " + len + " Buchstaben. Tippe das Wort mit der Tastatur.");
    for (var r = 0; r < MAX; r++) {
      var row = el("div", "row");
      row.setAttribute("role", "group");
      for (var c = 0; c < len; c++) {
        var tile = el("div", "tile");
        tile.appendChild(el("span", "tile-letter"));
        var mark = el("span", "tile-mark");
        mark.setAttribute("aria-hidden", "true");
        tile.appendChild(mark);
        row.appendChild(tile);
      }
      board.appendChild(row);
    }
  }

  function buildKeyboard() {
    var kb = $("keyboard");
    kb.textContent = "";
    KEY_ROWS.forEach(function (keys) {
      var row = el("div", "kb-row");
      keys.forEach(function (k) {
        var b = el("button", "key");
        b.type = "button";
        // Die physische Tastatur ist der Weg für Tastaturnutzer; die Bildschirmtasten bleiben aus der Tab-Reihenfolge.
        b.tabIndex = -1;
        b.setAttribute("data-key", k);
        if (k === "ENTER") { b.textContent = "Prüfen"; b.classList.add("key-wide"); b.setAttribute("aria-label", "Versuch prüfen"); }
        else if (k === "BACK") { b.textContent = "⌫"; b.classList.add("key-wide"); b.setAttribute("aria-label", "Buchstaben löschen"); }
        else b.textContent = k;
        row.appendChild(b);
      });
      kb.appendChild(row);
    });
  }

  function renderGame(animateLastRow) {
    var p = game.puzzle;
    var len = wordLength(p);
    var status = L.dayStatus(game.guesses, p.word, MAX);
    var finished = status === "won" || status === "lost";
    var rows = $("board").children;

    for (var r = 0; r < MAX; r++) {
      var row = rows[r];
      var guess = game.guesses[r];
      var letters = guess ? Array.from(guess) : (r === game.guesses.length && !finished ? Array.from(game.current) : []);
      var evaluation = guess ? L.evaluateGuess(guess, p.word) : null;
      var labelParts = [];
      for (var c = 0; c < len; c++) {
        var tile = row.children[c];
        var letter = letters[c] || "";
        var state = evaluation ? evaluation[c] : (letter ? "filled" : "empty");
        tile.firstChild.textContent = letter;
        var reveal = animateLastRow && evaluation && r === game.guesses.length - 1 && !reducedMotion();
        if (reveal) {
          tile.style.animationDelay = (c * 180) + "ms";
          tile.classList.add("tile-flip");
          // Farbe erst in der Mitte der Drehung wechseln.
          setStateLater(tile, state, c * 180 + 200);
        } else {
          tile.classList.remove("tile-flip");
          tile.style.animationDelay = "";
          tile.setAttribute("data-state", state);
        }
        if (letter) labelParts.push(letter + (evaluation ? " " + STATE_TEXT[evaluation[c]] : ""));
      }
      var rowLabel = "Versuch " + (r + 1) + ": " + (labelParts.length ? labelParts.join(", ") : "leer");
      row.setAttribute("aria-label", rowLabel);
      row.classList.toggle("row-current", !finished && r === game.guesses.length);
    }

    var left = MAX - game.guesses.length;
    $("game-attempts").textContent = finished
      ? (status === "won" ? "· Gelöst" : "· Aufgelöst")
      : "· Noch " + left + (left === 1 ? " Versuch" : " Versuche");

    // Tastatur einfärben
    var ks = L.keyboardStates(game.guesses, p.word);
    var delay = animateLastRow && !reducedMotion() ? len * 180 + 250 : 0;
    window.setTimeout(function () {
      var keys = $("keyboard").querySelectorAll(".key");
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i].getAttribute("data-key");
        if (ks[k]) {
          keys[i].setAttribute("data-state", ks[k]);
          keys[i].setAttribute("aria-label", k + ", " + STATE_TEXT[ks[k]]);
        } else {
          keys[i].removeAttribute("data-state");
        }
        keys[i].disabled = finished;
      }
    }, delay);

    $("keyboard").hidden = finished;
    $("keyboard-hint").hidden = finished;
    if (finished) {
      if (animateLastRow) {
        window.setTimeout(function () { showResult(status, true); }, delay + 150);
      } else {
        showResult(status, false);
      }
    } else {
      $("result").hidden = true;
    }
  }

  function setStateLater(tile, state, ms) {
    window.setTimeout(function () { tile.setAttribute("data-state", state); }, ms);
  }

  function showResult(status, celebrate) {
    var p = game.puzzle;
    var n = game.guesses.length;
    var won = status === "won";
    $("result-title").textContent = won ? WIN_TITLES[Math.min(n, WIN_TITLES.length) - 1] : "Diesmal hat es nicht geklappt";
    $("result-text").textContent = won
      ? "Du hast das Wort im " + n + ". Versuch gefunden."
      : "Kein Grund zur Sorge, das nächste Türchen kommt bestimmt. Das gesuchte Wort war:";
    var word = $("result-word");
    word.textContent = "";
    Array.from(p.word).forEach(function (ch) {
      var t = el("span", "tile tile-small");
      t.setAttribute("data-state", "correct");
      t.appendChild(el("span", "tile-letter", ch));
      var m = el("span", "tile-mark");
      m.setAttribute("aria-hidden", "true");
      t.appendChild(m);
      word.appendChild(t);
    });
    $("result").setAttribute("aria-description", "Lösungswort: " + p.word);
    $("result-text").textContent += won ? "" : " " + p.word + ".";
    if (p.fact) {
      $("result-fact").hidden = false;
      $("result-fact-text").textContent = p.fact;
    } else {
      $("result-fact").hidden = true;
    }
    $("result-status").textContent = "✓ Türchen " + p.day + " ist abgeschlossen.";

    var next = null;
    for (var d = p.day + 1; d <= 24; d++) {
      var q = puzzleFor(d);
      if (q && unlocked(d) && (statusFor(q) === "new" || statusFor(q) === "playing")) { next = q; break; }
    }
    if (!next) {
      for (var e = 1; e < p.day; e++) {
        var q2 = puzzleFor(e);
        if (q2 && unlocked(e) && (statusFor(q2) === "new" || statusFor(q2) === "playing")) { next = q2; break; }
      }
    }
    var nextLink = $("result-next");
    if (next) {
      nextLink.hidden = false;
      nextLink.href = "#/tag/" + next.day;
      nextLink.textContent = "Weiter mit Türchen " + next.day;
    } else {
      nextLink.hidden = true;
    }

    var result = $("result");
    result.hidden = false;
    result.classList.toggle("result-celebrate", celebrate && won && !reducedMotion());
    if (celebrate) {
      if (won && !reducedMotion()) {
        var lastRow = $("board").children[n - 1];
        lastRow.classList.add("row-win");
      }
      result.focus();
      result.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "nearest" });
    }
  }

  var toastTimer = null;
  function toast(message, keep) {
    var t = $("toast");
    t.textContent = message;
    t.classList.add("toast-visible");
    window.clearTimeout(toastTimer);
    if (!keep) toastTimer = window.setTimeout(function () { t.classList.remove("toast-visible"); }, 2600);
  }

  function shakeCurrentRow() {
    if (reducedMotion()) return;
    var row = $("board").children[game.guesses.length];
    if (!row) return;
    row.classList.remove("row-shake");
    void row.offsetWidth; // Animation neu starten
    row.classList.add("row-shake");
  }

  function isFinished() {
    var st = L.dayStatus(game.guesses, game.puzzle.word, MAX);
    return st === "won" || st === "lost";
  }

  function inputLetter(letter) {
    if (!game || game.busy || isFinished()) return;
    if (Array.from(game.current).length >= wordLength(game.puzzle)) return;
    game.current += letter;
    renderGame(false);
  }

  function inputBackspace() {
    if (!game || game.busy || isFinished()) return;
    var chars = Array.from(game.current);
    chars.pop();
    game.current = chars.join("");
    renderGame(false);
  }

  function inputEnter() {
    if (!game || game.busy || isFinished()) return;
    var error = L.validateGuess(game.current, wordLength(game.puzzle), ALLOWED);
    if (error) {
      toast(error);
      shakeCurrentRow();
      return;
    }
    var guess = game.current;
    game.guesses.push(guess);
    game.current = "";
    progress.days[game.puzzle.day] = { guesses: game.guesses.slice() };
    persist();

    var ev = L.evaluateGuess(guess, game.puzzle.word);
    $("announcer").textContent = "Versuch " + game.guesses.length + ": " +
      Array.from(guess).map(function (ch, i) { return ch + " " + STATE_TEXT[ev[i]]; }).join(", ") + ".";

    game.busy = !reducedMotion();
    renderGame(true);
    if (game.busy) {
      window.setTimeout(function () { if (game) game.busy = false; }, wordLength(game.puzzle) * 180 + 300);
    }
  }

  // ---------- Eingabe ----------

  document.addEventListener("keydown", function (e) {
    if ($("view-game").hidden || !game) return;
    if (e.ctrlKey || e.metaKey || (e.altKey && !e.getModifierState("AltGraph"))) return;
    var target = e.target;
    var onControl = target && (target.tagName === "A" || target.tagName === "BUTTON" || target.tagName === "INPUT");
    if (e.key === "Escape") { window.location.hash = "#/"; return; }
    if (e.key === "Enter") {
      if (onControl) return; // Links und Buttons behalten ihr normales Verhalten
      e.preventDefault();
      inputEnter();
    } else if (e.key === "Backspace") {
      e.preventDefault();
      inputBackspace();
    } else {
      var letter = L.normalizeLetter(e.key);
      if (letter && e.key.length === 1) {
        e.preventDefault();
        inputLetter(letter);
      }
    }
  });

  $("keyboard").addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".key") : null;
    if (!b) return;
    var k = b.getAttribute("data-key");
    if (k === "ENTER") inputEnter();
    else if (k === "BACK") inputBackspace();
    else inputLetter(k);
  });

  // ---------- Navigation ----------

  function showView(name) {
    $("view-home").hidden = name !== "home";
    $("view-game").hidden = name !== "game";
  }

  function route() {
    var m = /^#\/tag\/(\d{1,2})$/.exec(window.location.hash);
    if (m) {
      var day = parseInt(m[1], 10);
      var p = puzzleFor(day);
      if (p && unlocked(day)) {
        showView("game");
        openGame(day);
        window.scrollTo(0, 0);
        return;
      }
      game = null;
      showView("home");
      renderHome();
      // Gesperrte Türchen sind auch per direktem Link nicht spielbar.
      history.replaceState(null, "", window.location.pathname + window.location.search + "#/");
      toast(p ? "Geduld! Türchen " + day + " öffnet sich am " + day + ". Dezember." : "Dieses Türchen gibt es nicht.");
      return;
    }
    var fromGame = game;
    game = null;
    showView("home");
    renderHome();
    if (fromGame) {
      var door = $("calendar").children[fromGame.puzzle.day - 1];
      var link = door && door.querySelector("a");
      if (link) link.focus();
    }
  }

  // Toasts auch auf der Startseite anzeigen können: Toast-Element verschiebt sich nicht, es ist fixiert.
  window.addEventListener("hashchange", route);

  // Um Mitternacht (bzw. beim Zurückkehren zum Tab) neue Türchen freischalten.
  var lastDayKey = JSON.stringify(today());
  function checkDayChange() {
    var key = JSON.stringify(today());
    if (key !== lastDayKey) {
      lastDayKey = key;
      if (!game) renderHome();
    }
  }
  window.setInterval(checkDayChange, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) checkDayChange(); });

  applyBranding();
  route();
})();
