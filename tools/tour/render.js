// Renders the whole tour at 30 fps: one JPEG per frame, piped straight into ffmpeg.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
(async () => {
  const out = process.argv[2];
  const tmp = out.replace(/\.mp4$/, ".part.mp4");
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto("file://" + __dirname + "/tour.html");
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const total = await p.evaluate(() => window.TOTAL);
  const ff = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", "30", "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", tmp], { stdio: ["pipe", "inherit", "inherit"] });
  const frames = Math.ceil(total * 30);
  for (let i = 0; i < frames; i++) {
    await p.evaluate((x) => window.renderAt(x), i / 30);
    const buf = await p.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 300 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  const code = await new Promise((r) => ff.on("close", r));
  await b.close();
  if (code === 0) fs.renameSync(tmp, out);
  console.log("ffmpeg exit", code);
})();
