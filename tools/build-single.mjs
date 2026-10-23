// Bündelt die App in EINE HTML-Datei (dist/adventskalender.html).
// Nützlich für Plattformen, auf die man nur eine einzelne Datei hochladen kann.
// Aufruf: node tools/build-single.mjs [--test]   (--test schaltet allowTestMode ein)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const app = (p) => join(root, "app", p);
const read = (p) => readFileSync(app(p), "utf8");
const dataUri = (p, type) => `data:${type};base64,${readFileSync(app(p)).toString("base64")}`;

let html = read("index.html");
let config = read("js/config.js");
const forceTest = process.argv.includes("--test");
if (forceTest) config = config.replace(/allowTestMode:\s*false/, "allowTestMode: true");

// Logo als data-URI einbetten, damit die Datei ohne Begleitdateien funktioniert.
const logo = /logo:\s*"([^"]+)"/.exec(config);
if (logo && logo[1] && !logo[1].startsWith("data:")) {
  const type = logo[1].endsWith(".svg") ? "image/svg+xml" : logo[1].endsWith(".png") ? "image/png" : "image/jpeg";
  config = config.replace(logo[0], `logo: "${dataUri(logo[1], type)}"`);
}

const inline = (src) => `<script>\n${src.replace(/<\/script/gi, "<\\/script")}\n</script>`;
const replaceOnce = (needle, value) => {
  if (!html.includes(needle)) throw new Error("Nicht gefunden in index.html: " + needle);
  html = html.replace(needle, () => value);
};
replaceOnce('<link rel="stylesheet" href="css/styles.css">', `<style>\n${read("css/styles.css")}\n</style>`);
replaceOnce('<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">', `<link rel="icon" href="${dataUri("assets/favicon.svg", "image/svg+xml")}">`);
replaceOnce('<script src="js/config.js"></script>', inline(config));
replaceOnce('<script src="js/puzzles.js"></script>', inline(read("js/puzzles.js")));
replaceOnce('<script src="js/logic.js"></script>', inline(read("js/logic.js")));
replaceOnce('<script src="js/app.js"></script>', inline(read("js/app.js")));

mkdirSync(join(root, "dist"), { recursive: true });
const out = join(root, "dist", "adventskalender.html");
writeFileSync(out, html);
console.log("Geschrieben: " + out + " (" + Math.round(html.length / 1024) + " KB)");
