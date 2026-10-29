// node frames.js <out-dir> <t1> <t2> ...  → screenshots at those times (for checking)
const { chromium } = require("playwright");
(async () => {
  const [out, ...times] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto("file://" + __dirname + "/tour.html");
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  console.log("TOTAL", await p.evaluate(() => window.TOTAL));
  const ts = times.map(Number).sort((a, b) => a - b);
  let t = 0;
  for (const target of ts) {
    for (; t <= target; t += 1 / 30) await p.evaluate((x) => window.renderAt(x), t);
    await p.screenshot({ path: `${out}/f${String(target).padStart(5, "0")}.jpg`, type: "jpeg", quality: 85 });
  }
  console.log(errs.length ? errs.join("\n") : "no errors");
  await b.close();
})();
