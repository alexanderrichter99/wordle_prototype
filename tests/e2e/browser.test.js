// Browser-Test mit Playwright (nur Entwicklung). Start: npm run test:e2e
// Öffnet die App direkt per file:// – genau so, wie sie auch ohne Server läuft.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (e) {
  chromium = null;
}

const APP = pathToFileURL(path.join(__dirname, "..", "..", "app", "index.html")).href;
const SHOTS = process.env.SCREENSHOT_DIR || null;
const opts = { skip: chromium ? false : "Playwright ist nicht installiert (npm install)" };

let browser;
test.before(async () => {
  if (!chromium) return;
  const executablePath = process.env.CHROMIUM_PATH;
  browser = await chromium.launch(executablePath ? { executablePath } : {});
});
test.after(async () => { if (browser) await browser.close(); });

async function newPage(options = {}) {
  const context = await browser.newContext({ locale: "de-DE", ...options });
  const page = await context.newPage();
  const external = [];
  page.on("request", (r) => { if (!r.url().startsWith("file:") && !r.url().startsWith("data:")) external.push(r.url()); });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return { context, page, external, errors };
}

// Playwright kennt nur US-Tasten; Umlaute und ß senden wir wie eine deutsche Tastatur als keydown.
async function pressKey(page, key) {
  if (/^[a-zA-Z]$/.test(key)) return page.keyboard.press(key);
  return page.evaluate((k) => document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })), key);
}

async function typeWord(page, word) {
  for (const ch of Array.from(word)) await pressKey(page, ch);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500); // Aufdeck-Animation
}

async function tileStates(page, row) {
  return page.$$eval(`#board .row:nth-child(${row}) .tile`, (ts) => ts.map((t) => t.getAttribute("data-state")));
}

test("Kalender sperrt zukünftige Türchen, auch per Direktlink", opts, async () => {
  const { context, page, external, errors } = await newPage();
  await page.goto(APP + "?test=1&datum=2026-10-05");
  assert.equal(await page.locator("#calendar a.door").count(), 5);
  assert.equal(await page.locator('#calendar .door[data-status="locked"]').count(), 19);
  assert.match(await page.textContent("#today-card"), /Türchen 5 ist geöffnet/);
  // Gesperrte Türchen verraten ihr Lösungswort nirgends im DOM
  const html = await page.content();
  assert.ok(!html.includes("DANKE"), "Lösung eines gesperrten Türchens im DOM");

  await page.goto(APP + "?test=1&datum=2026-10-05#/tag/10");
  assert.equal(await page.isVisible("#view-home"), true);
  assert.equal(await page.isVisible("#view-game"), false);
  assert.match(await page.textContent("#toast"), /öffnet sich am 10\. Oktober/);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "kalender-desktop.png"), fullPage: true });
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await context.close();
});

test("Spielen per physischer Tastatur, Fehlermeldung, Gewinn und Wiederherstellung", opts, async () => {
  const { context, page, external, errors } = await newPage();
  await page.goto(APP + "?test=1#/tag/2"); // KERZE
  await page.keyboard.press("k");
  await page.keyboard.press("o");
  await page.keyboard.press("Enter");
  assert.match(await page.textContent("#toast"), /Zu kurz.*fehlen noch 3 Buchstaben/);
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");

  await typeWord(page, "EEXXX");
  assert.deepEqual(await tileStates(page, 1), ["present", "correct", "absent", "absent", "absent"]);
  assert.match(await page.getAttribute("#board .row:nth-child(1)", "aria-label"), /E kommt vor, andere Stelle, E richtige Stelle/);
  assert.match(await page.textContent("#game-attempts"), /Noch 5 Versuche/);
  assert.equal(await page.getAttribute('.key[data-key="E"]', "data-state"), "correct");
  assert.equal(await page.getAttribute('.key[data-key="X"]', "data-state"), "absent");

  await typeWord(page, "kerze");
  assert.equal(await page.isVisible("#result"), true);
  assert.match(await page.textContent("#result-title"), /Hervorragend/);
  assert.match(await page.textContent("#result-fact-text"), /Bienenwachs/);
  assert.match(await page.textContent("#result-status"), /Türchen 2 ist abgeschlossen/);
  assert.equal(await page.isVisible("#keyboard"), false);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "ergebnis.png"), fullPage: true });

  // Neu laden: Spielstand bleibt erhalten
  await page.reload();
  assert.equal(await page.isVisible("#result"), true);
  assert.deepEqual(await tileStates(page, 2), ["correct", "correct", "correct", "correct", "correct"]);

  // Kalender zeigt das Türchen als gelöst
  await page.click("#result-back");
  assert.equal(await page.getAttribute('#calendar li:nth-child(2) .door', "data-status"), "won");
  assert.match(await page.textContent("#progress-count"), /1 von 24/);
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await context.close();
});

test("Verlieren zeigt die Auflösung, Bildschirmtastatur funktioniert", opts, async () => {
  const { context, page, errors } = await newPage();
  await page.goto(APP + "?test=1#/tag/1"); // KONTO
  for (let i = 0; i < 6; i++) {
    for (const k of ["A", "B", "C", "D", "F"]) await page.click(`.key[data-key="${k}"]`);
    await page.click('.key[data-key="ENTER"]');
    await page.waitForTimeout(1400);
  }
  assert.equal(await page.isVisible("#result"), true);
  assert.match(await page.textContent("#result-title"), /nicht geklappt/);
  assert.match(await page.textContent("#result-text"), /KONTO/);
  await page.goto(APP + "?test=1#/");
  assert.equal(await page.getAttribute('#calendar li:nth-child(1) .door', "data-status"), "lost");
  assert.deepEqual(errors, []);
  await context.close();
});

test("Umlaute und ß über die Tastatur", opts, async () => {
  const { context, page, errors } = await newPage();
  await page.goto(APP + "?test=1#/tag/23"); // GRÜßE
  await typeWord(page, "grüße");
  assert.match(await page.textContent("#result-title"), /Volltreffer/);
  assert.equal(await page.textContent("#board .row:nth-child(1) .tile:nth-child(4) .tile-letter"), "ß");
  assert.deepEqual(errors, []);
  await context.close();
});

test("Echtes Datum: Freischaltung nach deutscher Zeit, auch bei anderer Rechner-Zeitzone", opts, async () => {
  // 30.9. 22:30 UTC = 1.10. 00:30 in Berlin (Sommerzeit), aber noch 30.9. in New York
  const { context, page, errors } = await newPage({ timezoneId: "America/New_York" });
  await page.clock.setFixedTime(new Date("2026-09-30T22:30:00Z"));
  await page.goto(APP);
  assert.equal(await page.locator("#calendar a.door").count(), 1);
  assert.equal(await page.isVisible("#test-banner"), false);

  await page.clock.setFixedTime(new Date("2026-09-30T21:30:00Z")); // 23:30 in Berlin
  await page.reload();
  assert.equal(await page.locator("#calendar a.door").count(), 0);
  assert.match(await page.textContent("#today-card"), /1\. Oktober 2026/);
  assert.deepEqual(errors, []);
  await context.close();
});

test("Ohne Browserspeicher bleibt das Spiel bedienbar", opts, async () => {
  const { context, page, errors } = await newPage();
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blockiert"); } });
  });
  await page.goto(APP + "?test=1#/tag/3");
  assert.equal(await page.isVisible("#storage-note"), true);
  await typeWord(page, "börse");
  assert.equal(await page.isVisible("#result"), true);
  assert.deepEqual(errors, []);
  await context.close();
});

test("Smartphone: kein horizontales Scrollen, Tastatur sichtbar", opts, async () => {
  const { context, page, errors } = await newPage({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  await page.clock.setFixedTime(new Date("2026-10-10T08:00:00Z"));
  await page.goto(APP);
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, "Startseite zu breit: " + overflow);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "kalender-mobil.png"), fullPage: true });
  await page.goto(APP + "#/tag/3"); // BÖRSE
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, "Spielansicht zu breit: " + overflow);
  const kb = await page.locator("#keyboard").boundingBox();
  assert.ok(kb && kb.y + kb.height <= 740 + 1, "Tastatur nicht vollständig sichtbar");
  await typeWord(page, "börse");
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "spiel-mobil.png") });
  assert.deepEqual(errors, []);
  await context.close();
});

test("Thema wird im Spiel nicht angezeigt", opts, async () => {
  const { context, page, errors } = await newPage();
  await page.goto(APP + "?test=1&datum=2026-10-05");
  assert.doesNotMatch(await page.textContent("#today-card"), /Thema/);
  await page.goto(APP + "?test=1#/tag/5");
  assert.equal(await page.isVisible("#game-topic"), false);
  assert.doesNotMatch(await page.textContent(".game-meta"), /Thema|Banking/);
  assert.deepEqual(errors, []);
  await context.close();
});

test("Nach allen 24 Türchen erscheinen Glückwunsch und Weihnachtsgrüße", opts, async () => {
  const { context, page, errors } = await newPage();
  // 23 Türchen als gelöst vorbelegen (Test-Spielstand des Oktober-Probelaufs)
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    const days = {};
    const words = ["KONTO","KERZE","BÖRSE","KRANZ","AKTIE","STERN","MÜNZE","KEKSE","SALDO","TANNE","FONDS","ENGEL","KASSE","NÜSSE","RENTE","LICHT","KARTE","MARKT","INDEX","PAKET","FROST","GABEN","GRÜßE"];
    words.forEach((w, i) => { days[i + 1] = { guesses: [w] }; });
    localStorage.setItem("adventskalender-2026-10-test", JSON.stringify({ version: 1, days }));
  });
  await page.goto(APP + "?test=1");
  assert.match(await page.textContent("#progress-count"), /23 von 24/);
  assert.equal(await page.locator(".finale").count(), 0);

  await page.goto(APP + "?test=1#/tag/24");
  await typeWord(page, "danke");
  assert.match(await page.textContent("#result-next"), /zum Abschluss/);
  await page.click("#result-next");
  assert.equal(await page.isVisible(".finale"), true);
  const text = await page.textContent("#today-card");
  assert.match(text, /Herzlichen Glückwunsch/);
  assert.match(text, /24 von 24 Wörtern erraten/);
  assert.match(text, /frohe Weihnachten/);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "abschluss.png") });
  assert.deepEqual(errors, []);
  await context.close();
});
